import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { isValidEmail } from '@/lib/validation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Shipping constants
const FREE_SHIPPING_THRESHOLD = 50;
const FLAT_RATE_SHIPPING = 5.99;

// Valid US states
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export async function POST(request) {
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

    // Calculate tax using Stripe Tax
    let tax = 0;
    try {
      const taxLineItems = orderItems.map(item => ({
        amount: Math.round(item.unitPrice * item.quantity * 100),
        reference: item.variantId,
        tax_behavior: 'exclusive',
        tax_code: 'txcd_99999999', // general physical goods
      }));

      if (shippingCost > 0) {
        taxLineItems.push({
          amount: Math.round(shippingCost * 100),
          reference: 'shipping',
          tax_behavior: 'exclusive',
          tax_code: 'txcd_92010001', // shipping
        });
      }

      const taxCalculation = await stripe.tax.calculations.create({
        currency: 'usd',
        line_items: taxLineItems,
        customer_details: {
          address: {
            line1: shipping.street,
            line2: shipping.street2 || undefined,
            city: shipping.city,
            state: stateUpper,
            postal_code: shipping.zip,
            country: 'US',
          },
          address_source: 'shipping',
        },
      });

      tax = taxCalculation.tax_amount_exclusive / 100;
    } catch (taxError) {
      console.error('Stripe Tax calculation failed:', taxError.message);
      return NextResponse.json(
        { error: 'Unable to calculate tax. Please try again or contact support.' },
        { status: 500 }
      );
    }

    // Calculate total
    const total = subtotal + shippingCost + tax;

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        customerEmail: customer.email,
        customerName: customer.name || shipping.name,
      },
    });

    // Create Order in database with PENDING status
    const order = await prisma.order.create({
      data: {
        userId,
        status: 'PENDING',
        subtotal,
        shipping: shippingCost,
        tax,
        total,
        stripePaymentId: paymentIntent.id,
        // Guest info
        guestEmail: userId ? null : customer.email,
        guestName: userId ? null : (customer.name || shipping.name),
        guestPhone: userId ? null : (customer.phone || null),
        // Shipping snapshot
        shippingName: shipping.name,
        shippingStreet: shipping.street,
        shippingStreet2: shipping.street2 || null,
        shippingCity: shipping.city,
        shippingState: stateUpper,
        shippingZip: shipping.zip,
        shippingCountry: 'US',
        // Order items
        items: {
          create: orderItems,
        },
      },
    });

    // Decrement stock for each ordered variant
    for (const item of orderItems) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      subtotal,
      shipping: shippingCost,
      tax,
      total,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to process checkout. Please try again.' },
      { status: 500 }
    );
  }
}
