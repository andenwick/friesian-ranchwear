import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { isValidEmail } from '@/lib/validation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { cleanupExpiredPendingOrders } from '@/lib/order-reservations';
import { reserveInventoryAndCreateOrder } from '@/lib/order-lifecycle';
import {
  CheckoutAttemptError,
  claimCheckoutAttempt,
  claimExistingCheckoutAttempt,
  prepareCheckoutPaymentCall,
  releaseCheckoutAttempt,
  updateClaimedCheckoutAttempt,
} from '@/lib/checkout-attempts';
import { operationalErrorCode } from '@/lib/operational-errors';

// Shipping constants
const FREE_SHIPPING_THRESHOLD = 50;
const FLAT_RATE_SHIPPING = 5.99;

async function readyCheckoutResponse(attempt) {
  const readyIntent = await stripe.paymentIntents.retrieve(attempt.paymentIntentId);
  return NextResponse.json({
    clientSecret: readyIntent.client_secret,
    orderId: attempt.orderId,
    ...attempt.checkoutData.totals,
  });
}

// Valid US states
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export async function POST(request) {
  // Rate limit checkout attempts
  const ip = getClientIP(request);
  const limiter = rateLimit(`checkout:${ip}`, 10, 60000);
  if (!limiter.success) {
    return NextResponse.json({ error: 'Too many checkout attempts. Please try again later.' }, { status: 429 });
  }

  let attemptClaim;
  try {
    const body = await request.json();
    const { items, customer, shipping } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!customer?.email || !isValidEmail(customer.email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (!shipping?.name || !shipping?.street || !shipping?.city || !shipping?.state || !shipping?.zip) {
      return NextResponse.json({ error: 'Complete shipping address is required' }, { status: 400 });
    }

    // Validate US state
    const stateUpper = shipping.state.toUpperCase();
    if (!US_STATES.includes(stateUpper)) {
      return NextResponse.json({ error: 'Invalid US state. We only ship within the US.' }, { status: 400 });
    }

    // Validate ZIP (simple 5-digit or 5+4 format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(shipping.zip)) {
      return NextResponse.json({ error: 'Invalid ZIP code format' }, { status: 400 });
    }

    // Get current user session (if logged in)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    const normalizedCustomer = {
      email: customer.email.toLowerCase().trim(),
      name: (customer.name || shipping.name).trim(),
      phone: customer.phone || null,
    };
    if (userId && session.user.email?.toLowerCase() !== normalizedCustomer.email) {
      return NextResponse.json({ error: 'Checkout email must match the signed-in account' }, { status: 400 });
    }
    const normalizedShipping = {
      name: shipping.name.trim(),
      street: shipping.street.trim(),
      street2: shipping.street2?.trim() || null,
      city: shipping.city.trim(),
      state: stateUpper,
      zip: shipping.zip,
      country: 'US',
    };
    const idempotencyKey = request.headers.get('idempotency-key');
    const actorScope = userId ? `user:${userId}` : 'guest-checkout';
    const checkoutPayload = {
      items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      customer: normalizedCustomer,
      shipping: normalizedShipping,
    };
    attemptClaim = await claimExistingCheckoutAttempt(prisma, {
      idempotencyKey,
      actorScope,
      payload: checkoutPayload,
    });
    let attempt = attemptClaim?.attempt;
    let leaseToken = attemptClaim?.leaseToken;
    if (attempt?.status === 'READY') {
      return readyCheckoutResponse(attempt);
    }

    if (!attempt) {

    // Release stale unpaid reservations before checking fresh stock.
    try {
      await cleanupExpiredPendingOrders({ limit: 25 });
    } catch (cleanupError) {
      console.error(JSON.stringify({
        event: 'checkout_reservation_cleanup_failed',
        code: operationalErrorCode(cleanupError, 'RESERVATION_CLEANUP_FAILED'),
      }));
    }

    // Validate cart items against database
    const variantIds = items.map(item => item.variantId).filter(Boolean);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: { id: true, name: true, basePrice: true, active: true }
        }
      }
    });

    // Create lookup map
    const variantMap = new Map(variants.map(v => [v.id, v]));

    // Validate each item and calculate totals
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
      }

      if (!item.variantId) {
        return NextResponse.json({ error: 'Invalid cart item: missing variant' }, { status: 400 });
      }

      const variant = variantMap.get(item.variantId);
      if (!variant) {
        return NextResponse.json({ error: `Product not found: ${item.name}` }, { status: 400 });
      }

      if (!variant.product.active) {
        return NextResponse.json({ error: `Product no longer available: ${variant.product.name}` }, { status: 400 });
      }

      if (variant.stock < item.quantity) {
        return NextResponse.json({
          error: `Insufficient stock for ${variant.product.name} (${variant.size || ''} ${variant.color || ''})`.trim()
        }, { status: 400 });
      }

      // Use database price, not client price
      const unitPrice = variant.price ? parseFloat(variant.price) : parseFloat(variant.product.basePrice);
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        variantId: variant.id,
        quantity: item.quantity,
        unitPrice,
        productName: variant.product.name,
        size: variant.size,
        color: variant.color,
      });
    }

    // Calculate shipping
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_RATE_SHIPPING;

    const taxLineItems = orderItems.map(item => ({
      amount: Math.round(item.unitPrice * item.quantity * 100),
      reference: item.variantId,
      tax_behavior: 'exclusive',
      tax_code: 'txcd_99999999', // general physical goods
    }));

    if (shippingCost > 0) {
      taxLineItems.push({
        amount: Math.round(shippingCost * 100),
        reference: 'shipping_cost',
        tax_behavior: 'exclusive',
        tax_code: 'txcd_92010001', // shipping
      });
    }

    const taxRequest = {
      currency: 'usd',
      line_items: taxLineItems,
      customer_details: {
        address: {
          line1: normalizedShipping.street,
          line2: normalizedShipping.street2 || undefined,
          city: normalizedShipping.city,
          state: normalizedShipping.state,
          postal_code: normalizedShipping.zip,
          country: 'US',
        },
        address_source: 'shipping',
      },
    };
    attemptClaim = await claimCheckoutAttempt(prisma, {
      idempotencyKey,
      actorScope,
      payload: checkoutPayload,
      checkoutData: {
        items: orderItems,
        customer: normalizedCustomer,
        shipping: normalizedShipping,
        subtotal,
        shippingCost,
        taxRequest,
      },
    });
    attempt = attemptClaim.attempt;
    leaseToken = attemptClaim.leaseToken;
    }

    // Another request can complete the attempt after the early lookup but before
    // the create hits its unique constraint. Reuse that completed result too.
    if (attempt.status === 'READY') {
      return readyCheckoutResponse(attempt);
    }

    if (attempt.status === 'INITIALIZING') {
      const taxCalculation = await stripe.tax.calculations.create(
        attempt.checkoutData.taxRequest,
        { idempotencyKey: `checkout-tax:${attempt.id}` }
      );
      const tax = taxCalculation.tax_amount_exclusive / 100;
      const totalCents = taxCalculation.amount_total;
      const expectedTotalCents = Math.round(
        (attempt.checkoutData.subtotal + attempt.checkoutData.shippingCost) * 100
      ) + taxCalculation.tax_amount_exclusive;
      if (
        !Number.isInteger(totalCents) ||
        totalCents < 0 ||
        totalCents !== expectedTotalCents
      ) {
        throw new Error('Stripe Tax returned an invalid total');
      }
      const totals = {
        subtotal: attempt.checkoutData.subtotal,
        shipping: attempt.checkoutData.shippingCost,
        tax,
        total: totalCents / 100,
      };
      const checkoutData = { ...attempt.checkoutData, totals };
      await updateClaimedCheckoutAttempt(prisma, attempt.id, leaseToken, {
        status: 'TAX_READY',
        taxCalculationId: taxCalculation.id,
        amountCents: totalCents,
        currency: 'usd',
        checkoutData,
      });
      attempt = {
        ...attempt,
        status: 'TAX_READY',
        taxCalculationId: taxCalculation.id,
        amountCents: totalCents,
        currency: 'usd',
        checkoutData,
      };
    }

    let orderId = attempt.orderId;
    if (attempt.status === 'TAX_READY') {
      const snapshot = attempt.checkoutData;
      const totals = snapshot.totals;
      const order = await reserveInventoryAndCreateOrder(prisma, {
        checkoutAttemptId: attempt.id,
        checkoutLeaseToken: leaseToken,
        orderData: {
          userId,
          status: 'PENDING',
          subtotal: totals.subtotal,
          shipping: totals.shipping,
          tax: totals.tax,
          total: totals.total,
          paymentStatus: 'PENDING',
          paymentAmountCents: attempt.amountCents,
          paymentCurrency: attempt.currency,
          amountRefundedCents: 0,
          stripeTaxCalculationId: attempt.taxCalculationId,
          guestEmail: userId ? null : snapshot.customer.email,
          guestName: userId ? null : snapshot.customer.name,
          guestPhone: userId ? null : snapshot.customer.phone,
          shippingName: snapshot.shipping.name,
          shippingStreet: snapshot.shipping.street,
          shippingStreet2: snapshot.shipping.street2,
          shippingCity: snapshot.shipping.city,
          shippingState: snapshot.shipping.state,
          shippingZip: snapshot.shipping.zip,
          shippingCountry: snapshot.shipping.country,
        },
        items: snapshot.items,
      });
      orderId = order.id;
      attempt = { ...attempt, status: 'RESERVED', orderId };
    }

    if (attempt.status !== 'RESERVED' || !orderId) {
      throw new Error(`Checkout attempt ${attempt.id} is not ready for payment creation`);
    }

    await prepareCheckoutPaymentCall(prisma, attempt.id, leaseToken);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: attempt.amountCents,
      currency: attempt.currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId,
        taxCalculationId: attempt.taxCalculationId,
      },
    }, { idempotencyKey: `checkout-payment:${attempt.id}` });

    await prisma.$transaction(async (tx) => {
      const linkedOrder = await tx.order.updateMany({
        where: { id: orderId, stripePaymentId: null, paymentStatus: 'PENDING' },
        data: { stripePaymentId: paymentIntent.id },
      });
      const completedAttempt = await tx.checkoutAttempt.updateMany({
        where: { id: attempt.id, leaseToken, status: 'RESERVED', orderId },
        data: {
          status: 'READY',
          paymentIntentId: paymentIntent.id,
          leaseToken: null,
          leaseExpiresAt: null,
          lastError: null,
        },
      });
      if (linkedOrder.count === 0 || completedAttempt.count === 0) {
        throw new Error('Checkout payment link changed while it was being finalized');
      }
    });

    const totals = attempt.checkoutData.totals;
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId,
      ...totals,
    });
  } catch (error) {
    if (attemptClaim?.leaseToken) {
      await releaseCheckoutAttempt(
        prisma,
        attemptClaim.attempt.id,
        attemptClaim.leaseToken,
        error
      );
    }
    if (error instanceof CheckoutAttemptError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(JSON.stringify({
      event: 'checkout_failed',
      attemptId: attemptClaim?.attempt?.id || null,
      code: operationalErrorCode(error, 'CHECKOUT_FAILED'),
    }));
    return NextResponse.json(
      { error: 'Failed to process checkout. Please try again.' },
      { status: 500 }
    );
  }
}
