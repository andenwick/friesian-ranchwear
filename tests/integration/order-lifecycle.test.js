import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelPendingOrderAndRestoreStock,
  markOrderRefunded,
  markPendingOrderPaid,
  reserveInventoryAndCreateOrder,
} from '@/lib/order-lifecycle';
import { cleanupExpiredPendingOrders } from '@/lib/order-reservations';
import {
  drainOrderFinancialOperations,
  runFinancialOperation,
} from '@/lib/financial-operations';
import { projectStripeEvent } from '@/lib/stripe-event-ledger';
import {
  CheckoutAttemptError,
  claimCheckoutAttempt,
  updateClaimedCheckoutAttempt,
} from '@/lib/checkout-attempts';

const prisma = new PrismaClient();

async function resetDatabase() {
  await prisma.financialOperation.deleteMany();
  await prisma.stripeEvent.deleteMany();
  await prisma.checkoutAttempt.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
}

async function createVariant({ name = 'Test Ranchwear', stock = 3, price = '32.00' } = {}) {
  const product = await prisma.product.create({
    data: {
      name,
      basePrice: price,
      active: true,
      variants: {
        create: {
          sku: `TEST-${name}-${stock}-${Math.random()}`,
          size: 'M',
          color: 'Black',
          stock,
        },
      },
    },
    include: { variants: true },
  });

  return product.variants[0];
}

function orderData(stripePaymentId, overrides = {}) {
  return {
    status: 'PENDING',
    subtotal: 32,
    shipping: 5.99,
    tax: 2.5,
    total: 40.49,
    paymentStatus: 'PENDING',
    paymentAmountCents: 4049,
    paymentCurrency: 'usd',
    amountRefundedCents: 0,
    stripePaymentId,
    guestEmail: 'buyer@example.com',
    guestName: 'Test Buyer',
    shippingName: 'Test Buyer',
    shippingStreet: '100 Test Street',
    shippingCity: 'Stansbury Park',
    shippingState: 'UT',
    shippingZip: '84074',
    shippingCountry: 'US',
    ...overrides,
  };
}

function orderItem(variant, overrides = {}) {
  return {
    variantId: variant.id,
    quantity: 1,
    unitPrice: 32,
    productName: 'Test Ranchwear',
    size: 'M',
    color: 'Black',
    ...overrides,
  };
}

async function reserve(variant, paymentIntentId, options = {}) {
  return reserveInventoryAndCreateOrder(prisma, {
    orderData: orderData(paymentIntentId, options.orderData),
    items: options.items || [orderItem(variant)],
  });
}

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('order reservation transactions', () => {
  it('decrements stock and creates the pending order atomically', async () => {
    const variant = await createVariant({ stock: 3 });

    const order = await reserveInventoryAndCreateOrder(prisma, {
      orderData: orderData('pi_reserve_success'),
      items: [orderItem(variant, { quantity: 2 })],
    });

    const [storedOrder, storedVariant] = await Promise.all([
      prisma.order.findUnique({ where: { id: order.id }, include: { items: true } }),
      prisma.productVariant.findUnique({ where: { id: variant.id } }),
    ]);

    expect(storedOrder.status).toBe('PENDING');
    expect(storedOrder.items).toHaveLength(1);
    expect(storedOrder.items[0].quantity).toBe(2);
    expect(storedVariant.stock).toBe(1);
  });

  it('rolls back earlier decrements when a later item is out of stock', async () => {
    const available = await createVariant({ name: 'Available', stock: 2 });
    const unavailable = await createVariant({ name: 'Unavailable', stock: 0 });

    await expect(
      reserveInventoryAndCreateOrder(prisma, {
        orderData: orderData('pi_rollback'),
        items: [
          orderItem(available, { productName: 'Available' }),
          orderItem(unavailable, { productName: 'Unavailable' }),
        ],
      })
    ).rejects.toThrow('Insufficient stock for Unavailable');

    const [availableAfter, orderCount] = await Promise.all([
      prisma.productVariant.findUnique({ where: { id: available.id } }),
      prisma.order.count(),
    ]);

    expect(availableAfter.stock).toBe(2);
    expect(orderCount).toBe(0);
  });

  it('allows only one concurrent reservation for the final unit', async () => {
    const variant = await createVariant({ stock: 1 });

    const results = await Promise.allSettled([
      reserve(variant, 'pi_concurrent_a'),
      reserve(variant, 'pi_concurrent_b'),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    await expect(prisma.order.count()).resolves.toBe(1);
    await expect(
      prisma.productVariant.findUnique({ where: { id: variant.id }, select: { stock: true } })
    ).resolves.toEqual({ stock: 0 });
  });

  it('rejects duplicate cart lines whose aggregate quantity exceeds stock', async () => {
    const variant = await createVariant({ stock: 3 });

    await expect(
      reserveInventoryAndCreateOrder(prisma, {
        orderData: orderData('pi_duplicate_lines'),
        items: [
          orderItem(variant, { quantity: 2 }),
          orderItem(variant, { quantity: 2 }),
        ],
      })
    ).rejects.toThrow('Insufficient stock for Test Ranchwear');

    await expect(prisma.order.count()).resolves.toBe(0);
    await expect(
      prisma.productVariant.findUnique({ where: { id: variant.id }, select: { stock: true } })
    ).resolves.toEqual({ stock: 3 });
  });
});

describe('admin inventory edit fencing', () => {
  it('preserves a checkout decrement and rolls back product metadata on conflict', async () => {
    const variant = await createVariant({ name: 'Original Name', stock: 3 });
    let releaseEdit;
    const checkoutFinished = new Promise(resolve => { releaseEdit = resolve; });
    let publishObservation;
    const observed = new Promise(resolve => { publishObservation = resolve; });

    const staleEdit = prisma.$transaction(async tx => {
      const snapshot = await tx.productVariant.findUnique({ where: { id: variant.id } });
      await tx.product.updateMany({
        where: { id: variant.productId },
        data: { name: 'Stale Admin Name' },
      });
      publishObservation(snapshot);
      await checkoutFinished;
      const updated = await tx.productVariant.updateMany({
        where: {
          id: snapshot.id,
          stock: snapshot.stock,
          updatedAt: snapshot.updatedAt,
        },
        data: { stock: 9 },
      });
      if (updated.count === 0) throw new Error('STALE_PRODUCT_EDIT');
    });

    await observed;
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { stock: { decrement: 1 } },
    });
    releaseEdit();

    await expect(staleEdit).rejects.toThrow('STALE_PRODUCT_EDIT');
    await expect(prisma.product.findUnique({
      where: { id: variant.productId },
      select: { name: true },
    })).resolves.toEqual({ name: 'Original Name' });
    await expect(prisma.productVariant.findUnique({
      where: { id: variant.id },
      select: { stock: true },
    })).resolves.toEqual({ stock: 2 });
  });
});

describe('payment projection transactions', () => {
  it('restores stock exactly once when a pending payment is cancelled', async () => {
    const variant = await createVariant({ stock: 2 });
    await reserve(variant, 'pi_cancel_once');

    const cancellationResults = await Promise.all([
      cancelPendingOrderAndRestoreStock(prisma, 'pi_cancel_once'),
      cancelPendingOrderAndRestoreStock(prisma, 'pi_cancel_once'),
    ]);

    expect(cancellationResults.sort()).toEqual([false, true]);
    await expect(cancelPendingOrderAndRestoreStock(prisma, 'pi_cancel_once')).resolves.toBe(false);

    const [order, storedVariant] = await Promise.all([
      prisma.order.findFirst({ where: { stripePaymentId: 'pi_cancel_once' } }),
      prisma.productVariant.findUnique({ where: { id: variant.id } }),
    ]);

    expect(order.status).toBe('CANCELLED');
    expect(storedVariant.stock).toBe(2);
  });

  it('does not cancel or restock an order after payment succeeds', async () => {
    const variant = await createVariant({ stock: 2 });
    await reserve(variant, 'pi_paid_wins');

    const succeeded = { id: 'pi_paid_wins', amount_received: 4049, currency: 'usd' };
    await expect(markPendingOrderPaid(prisma, succeeded)).resolves.toBe(true);
    await expect(markPendingOrderPaid(prisma, succeeded)).resolves.toBe(false);
    await expect(cancelPendingOrderAndRestoreStock(prisma, 'pi_paid_wins')).resolves.toBe(false);

    const [order, storedVariant] = await Promise.all([
      prisma.order.findFirst({ where: { stripePaymentId: 'pi_paid_wins' } }),
      prisma.productVariant.findUnique({ where: { id: variant.id } }),
    ]);

    expect(order.status).toBe('PAID');
    expect(storedVariant.stock).toBe(1);
  });

  it('rejects a successful payment projected onto a cancelled order', async () => {
    const variant = await createVariant();
    await reserve(variant, 'pi_cancelled_success');
    await cancelPendingOrderAndRestoreStock(prisma, 'pi_cancelled_success');

    await expect(markPendingOrderPaid(prisma, {
      id: 'pi_cancelled_success',
      amount_received: 4049,
      currency: 'usd',
    })).rejects.toThrow(
      'attached to CANCELLED/CANCELLED order'
    );
  });

  it('projects a full refund once without changing inventory', async () => {
    const variant = await createVariant({ stock: 2 });
    const reservedOrder = await reserve(variant, 'pi_refund');
    await markPendingOrderPaid(prisma, {
      id: 'pi_refund',
      amount_received: 4049,
      currency: 'usd',
    });

    const refund = {
      payment_intent: 'pi_refund',
      amount_refunded: 4049,
      currency: 'usd',
    };
    await expect(markOrderRefunded(prisma, refund)).resolves.toEqual({
      changed: true,
      orderId: reservedOrder.id,
      amountApplied: 4049,
    });
    await expect(markOrderRefunded(prisma, refund)).resolves.toEqual({
      changed: false,
      orderId: reservedOrder.id,
      amountApplied: 0,
    });

    const [order, storedVariant] = await Promise.all([
      prisma.order.findFirst({ where: { stripePaymentId: 'pi_refund' } }),
      prisma.productVariant.findUnique({ where: { id: variant.id } }),
    ]);

    expect(order.status).toBe('REFUNDED');
    expect(storedVariant.stock).toBe(1);
  });

  it('preserves a refund that arrives before the success event', async () => {
    const variant = await createVariant({ stock: 2 });
    const reservedOrder = await reserve(variant, 'pi_refund_before_success');
    const refund = {
      payment_intent: 'pi_refund_before_success',
      amount_refunded: 4049,
      currency: 'usd',
    };

    await expect(markOrderRefunded(prisma, refund)).resolves.toEqual({
      changed: true,
      orderId: reservedOrder.id,
      amountApplied: 4049,
    });
    await expect(markPendingOrderPaid(prisma, {
      id: 'pi_refund_before_success',
      amount_received: 4049,
      currency: 'usd',
    })).resolves.toBe(false);

    await expect(prisma.order.findFirst({
      where: { stripePaymentId: 'pi_refund_before_success' },
      select: { status: true, paymentStatus: true, amountRefundedCents: true },
    })).resolves.toEqual({
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
      amountRefundedCents: 4049,
    });
  });

  it('records a partial refund without returning physical inventory', async () => {
    const variant = await createVariant({ stock: 2 });
    const reservedOrder = await reserve(variant, 'pi_partial_refund');

    await expect(markOrderRefunded(prisma, {
      payment_intent: 'pi_partial_refund',
      amount_refunded: 1200,
      currency: 'usd',
    })).resolves.toEqual({
      changed: true,
      orderId: reservedOrder.id,
      amountApplied: 1200,
    });

    const [order, storedVariant] = await Promise.all([
      prisma.order.findFirst({ where: { stripePaymentId: 'pi_partial_refund' } }),
      prisma.productVariant.findUnique({ where: { id: variant.id } }),
    ]);
    expect(order.status).toBe('PAID');
    expect(order.paymentStatus).toBe('PARTIALLY_REFUNDED');
    expect(order.amountRefundedCents).toBe(1200);
    expect(storedVariant.stock).toBe(1);
  });

  it('rejects successful payment amount and currency mismatches', async () => {
    const variant = await createVariant();
    await reserve(variant, 'pi_mismatch');

    await expect(markPendingOrderPaid(prisma, {
      id: 'pi_mismatch',
      amount_received: 4000,
      currency: 'usd',
    })).rejects.toThrow('Payment amount mismatch');
    await expect(markPendingOrderPaid(prisma, {
      id: 'pi_mismatch',
      amount_received: 4049,
      currency: 'cad',
    })).rejects.toThrow('Payment currency mismatch');

    await expect(prisma.order.findFirst({
      where: { stripePaymentId: 'pi_mismatch' },
      select: { status: true, paymentStatus: true },
    })).resolves.toEqual({ status: 'PENDING', paymentStatus: 'PENDING' });
  });
});

describe('expired reservation cleanup', () => {
  it('cancels an expired order without a PaymentIntent and restores stock once', async () => {
    const variant = await createVariant({ stock: 2 });
    await reserve(variant, null, {
      orderData: { createdAt: new Date('2026-01-01T00:00:00Z') },
    });
    const stripeClient = {
      paymentIntents: {
        retrieve: vi.fn(),
        cancel: vi.fn(),
      },
    };

    const summary = await cleanupExpiredPendingOrders({
      now: new Date('2026-01-01T01:00:00Z'),
      prismaClient: prisma,
      stripeClient,
    });

    expect(summary.cancelled).toBe(1);
    expect(stripeClient.paymentIntents.retrieve).not.toHaveBeenCalled();
    await expect(
      prisma.productVariant.findUnique({ where: { id: variant.id }, select: { stock: true } })
    ).resolves.toEqual({ stock: 2 });
  });

  it('marks an expired order paid when Stripe reports success and keeps stock reserved', async () => {
    const variant = await createVariant({ stock: 2 });
    const order = await reserve(variant, 'pi_cleanup_paid', {
      orderData: {
        createdAt: new Date('2026-01-01T00:00:00Z'),
        stripeTaxCalculationId: 'taxcalc_cleanup_paid',
      },
    });
    const stripeClient = {
      paymentIntents: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'pi_cleanup_paid',
          status: 'succeeded',
          amount_received: 4049,
          currency: 'usd',
          created: 1767225600,
        }),
        cancel: vi.fn(),
      },
      tax: {
        transactions: {
          createFromCalculation: vi.fn().mockResolvedValue({ id: 'tax_cleanup_paid' }),
          createReversal: vi.fn(),
        },
      },
    };

    const summary = await cleanupExpiredPendingOrders({
      now: new Date('2026-01-01T01:00:00Z'),
      prismaClient: prisma,
      stripeClient,
    });

    expect(summary.markedPaid).toBe(1);
    expect(stripeClient.paymentIntents.cancel).not.toHaveBeenCalled();
    await expect(
      prisma.productVariant.findUnique({ where: { id: variant.id }, select: { stock: true } })
    ).resolves.toEqual({ stock: 1 });

    await expect(projectStripeEvent(prisma, {
      id: 'evt_after_cleanup_paid',
      type: 'payment_intent.succeeded',
      created: 1767229200,
      data: {
        object: {
          id: 'pi_cleanup_paid',
          status: 'succeeded',
          amount_received: 4049,
          currency: 'usd',
          created: 1767225600,
        },
      },
    })).resolves.toEqual({ duplicate: false, orderId: order.id });
    await expect(prisma.financialOperation.count({
      where: { orderId: order.id, kind: 'COMMIT_TAX' },
    })).resolves.toBe(1);
  });
});

describe('durable Stripe event projection', () => {
  it('deduplicates local success effects and resumes the tax operation', async () => {
    const variant = await createVariant({ stock: 2 });
    const order = await reserve(variant, 'pi_event_paid', {
      orderData: { stripeTaxCalculationId: 'taxcalc_event_paid' },
    });
    const event = {
      id: 'evt_paid_once',
      type: 'payment_intent.succeeded',
      created: 1789040000,
      data: {
        object: { id: 'pi_event_paid', amount_received: 4049, currency: 'usd' },
      },
    };

    await expect(projectStripeEvent(prisma, event)).resolves.toEqual({
      duplicate: false,
      orderId: order.id,
    });
    await expect(projectStripeEvent(prisma, event)).resolves.toEqual({
      duplicate: true,
      orderId: order.id,
    });
    await expect(prisma.stripeEvent.count({ where: { id: event.id } })).resolves.toBe(1);
    await expect(prisma.financialOperation.count({ where: { orderId: order.id } })).resolves.toBe(1);

    const stripeClient = {
      tax: {
        transactions: {
          createFromCalculation: vi.fn().mockResolvedValue({ id: 'tax_transaction_paid' }),
          createReversal: vi.fn(),
        },
      },
    };
    await drainOrderFinancialOperations(prisma, stripeClient, order.id);
    await drainOrderFinancialOperations(prisma, stripeClient, order.id);

    expect(stripeClient.tax.transactions.createFromCalculation).toHaveBeenCalledOnce();
    expect(stripeClient.tax.transactions.createFromCalculation).toHaveBeenCalledWith(
      {
        calculation: 'taxcalc_event_paid',
        reference: `tax-sale:${order.id}`,
      },
      { idempotencyKey: `tax-sale:${order.id}` }
    );
    await expect(prisma.order.findUnique({
      where: { id: order.id },
      select: { paymentStatus: true, stripeTaxTransactionId: true },
    })).resolves.toEqual({
      paymentStatus: 'PAID',
      stripeTaxTransactionId: 'tax_transaction_paid',
    });
  });

  it('converges concurrent delivery of the same event to one projection', async () => {
    const variant = await createVariant({ stock: 2 });
    const order = await reserve(variant, 'pi_event_concurrent', {
      orderData: { stripeTaxCalculationId: 'taxcalc_event_concurrent' },
    });
    const event = {
      id: 'evt_paid_concurrent',
      type: 'payment_intent.succeeded',
      created: 1789040000,
      data: {
        object: { id: 'pi_event_concurrent', amount_received: 4049, currency: 'usd' },
      },
    };

    const deliveries = await Promise.allSettled([
      projectStripeEvent(prisma, event),
      projectStripeEvent(prisma, event),
    ]);
    expect(deliveries.some(result => result.status === 'fulfilled')).toBe(true);
    await expect(projectStripeEvent(prisma, event)).resolves.toMatchObject({
      duplicate: true,
      orderId: order.id,
    });
    await expect(prisma.stripeEvent.count({ where: { id: event.id } })).resolves.toBe(1);
    await expect(prisma.financialOperation.count({ where: { orderId: order.id } })).resolves.toBe(1);
    await expect(prisma.order.findUnique({
      where: { id: order.id },
      select: { paymentStatus: true },
    })).resolves.toEqual({ paymentStatus: 'PAID' });
  });

  it('persists an unknown-order retry without partially projecting an event', async () => {
    const event = {
      id: 'evt_unknown_order',
      type: 'payment_intent.succeeded',
      created: 1789040000,
      data: {
        object: { id: 'pi_missing', amount_received: 4049, currency: 'usd' },
      },
    };

    await expect(projectStripeEvent(prisma, event)).rejects.toThrow(
      'No order found for successful payment pi_missing'
    );
    await expect(prisma.stripeEvent.findUnique({
      where: { id: event.id },
      select: { status: true, attempts: true },
    })).resolves.toEqual({ status: 'RETRY', attempts: 1 });
  });

  it('retries an early cancellation and releases stock after the order is linked', async () => {
    const variant = await createVariant({ stock: 2 });
    const order = await reserve(variant, null);
    const event = {
      id: 'evt_cancel_before_link',
      type: 'payment_intent.canceled',
      created: 1789040000,
      data: { object: { id: 'pi_linked_later', status: 'canceled' } },
    };

    await expect(projectStripeEvent(prisma, event)).rejects.toThrow(
      'No order found for cancelled payment pi_linked_later'
    );
    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentId: 'pi_linked_later' },
    });
    await expect(projectStripeEvent(prisma, event)).resolves.toEqual({
      duplicate: false,
      orderId: order.id,
    });

    await expect(prisma.order.findUnique({
      where: { id: order.id },
      select: { status: true, paymentStatus: true },
    })).resolves.toEqual({ status: 'CANCELLED', paymentStatus: 'CANCELLED' });
    await expect(prisma.productVariant.findUnique({
      where: { id: variant.id },
      select: { stock: true },
    })).resolves.toEqual({ stock: 2 });
  });

  it('commits tax before reversing an out-of-order full refund', async () => {
    const variant = await createVariant({ stock: 2 });
    const order = await reserve(variant, 'pi_refund_event_first', {
      orderData: { stripeTaxCalculationId: 'taxcalc_refund_first' },
    });
    const refundEvent = {
      id: 'evt_refund_first',
      type: 'charge.refunded',
      created: 1789040010,
      data: {
        object: {
          id: 'ch_refund_first',
          payment_intent: 'pi_refund_event_first',
          amount_refunded: 4049,
          currency: 'usd',
        },
      },
    };
    const successEvent = {
      id: 'evt_success_after_refund',
      type: 'payment_intent.succeeded',
      created: 1789040000,
      data: {
        object: { id: 'pi_refund_event_first', amount_received: 4049, currency: 'usd' },
      },
    };

    await projectStripeEvent(prisma, refundEvent);
    await projectStripeEvent(prisma, successEvent);

    const callOrder = [];
    const stripeClient = {
      tax: {
        transactions: {
          createFromCalculation: vi.fn().mockImplementation(async () => {
            callOrder.push('commit');
            return { id: 'tax_original' };
          }),
          createReversal: vi.fn().mockImplementation(async () => {
            callOrder.push('reverse');
            return { id: 'tax_reversal' };
          }),
        },
      },
    };
    await drainOrderFinancialOperations(prisma, stripeClient, order.id);

    expect(callOrder).toEqual(['commit', 'reverse']);
    expect(stripeClient.tax.transactions.createReversal).toHaveBeenCalledWith(
      expect.objectContaining({
        original_transaction: 'tax_original',
        flat_amount: -4049,
      }),
      { idempotencyKey: 'tax-refund:ch_refund_first:4049' }
    );
  });

  it('restores inventory once through the durable cancellation event path', async () => {
    const variant = await createVariant({ stock: 2 });
    const order = await reserve(variant, 'pi_ledger_cancel');
    const event = {
      id: 'evt_ledger_cancel',
      type: 'payment_intent.canceled',
      created: 1789040000,
      data: { object: { id: 'pi_ledger_cancel' } },
    };

    await projectStripeEvent(prisma, event);
    await projectStripeEvent(prisma, event);

    await expect(prisma.order.findUnique({
      where: { id: order.id },
      select: { status: true, paymentStatus: true },
    })).resolves.toEqual({ status: 'CANCELLED', paymentStatus: 'CANCELLED' });
    await expect(prisma.productVariant.findUnique({
      where: { id: variant.id },
      select: { stock: true },
    })).resolves.toEqual({ stock: 2 });
  });

  it('never reverses more than the latest cumulative refund during overlapping events', async () => {
    const variant = await createVariant({ stock: 2 });
    const order = await reserve(variant, 'pi_overlapping_refunds', {
      orderData: { stripeTaxCalculationId: 'taxcalc_overlapping_refunds' },
    });
    await projectStripeEvent(prisma, {
      id: 'evt_overlapping_success',
      type: 'payment_intent.succeeded',
      created: 1789040000,
      data: {
        object: { id: 'pi_overlapping_refunds', amount_received: 4049, currency: 'usd' },
      },
    });

    const refundEvent = (id, chargeId, amount) => ({
      id,
      type: 'charge.refunded',
      created: 1789040010,
      data: {
        object: {
          id: chargeId,
          payment_intent: 'pi_overlapping_refunds',
          amount_refunded: amount,
          currency: 'usd',
        },
      },
    });
    await Promise.all([
      projectStripeEvent(prisma, refundEvent('evt_refund_1200', 'ch_overlap', 1200)),
      projectStripeEvent(prisma, refundEvent('evt_refund_2000', 'ch_overlap', 2000)),
    ]);

    const reversals = await prisma.financialOperation.findMany({
      where: { orderId: order.id, kind: 'REVERSE_TAX_PARTIAL' },
      select: { requestData: true },
    });
    expect(reversals.reduce((sum, item) => sum + item.requestData.flat_amount, 0)).toBe(-2000);
    await expect(prisma.order.findUnique({
      where: { id: order.id },
      select: { amountRefundedCents: true, paymentStatus: true },
    })).resolves.toEqual({
      amountRefundedCents: 2000,
      paymentStatus: 'PARTIALLY_REFUNDED',
    });
  });

  it('keeps the first external-call timestamp and stops after the safe replay window', async () => {
    const variant = await createVariant();
    const order = await reserve(variant, 'pi_replay_window', {
      orderData: { stripeTaxCalculationId: 'taxcalc_replay_window' },
    });
    await projectStripeEvent(prisma, {
      id: 'evt_replay_window',
      type: 'payment_intent.succeeded',
      created: 1789040000,
      data: {
        object: { id: 'pi_replay_window', amount_received: 4049, currency: 'usd' },
      },
    });
    const operation = await prisma.financialOperation.findFirst({ where: { orderId: order.id } });
    const stripeClient = {
      tax: {
        transactions: {
          createFromCalculation: vi.fn().mockRejectedValue(new Error('uncertain provider response')),
          createReversal: vi.fn(),
        },
      },
    };
    const startedAt = new Date('2026-01-01T00:00:00Z');

    await expect(runFinancialOperation(prisma, stripeClient, operation.id, {
      now: startedAt,
    })).rejects.toThrow('uncertain provider response');
    await prisma.financialOperation.update({
      where: { id: operation.id },
      data: { nextAttemptAt: new Date('2026-01-01T21:59:00Z') },
    });
    await expect(runFinancialOperation(prisma, stripeClient, operation.id, {
      now: new Date('2026-01-01T22:00:00Z'),
    })).rejects.toThrow('uncertain provider response');
    await prisma.financialOperation.update({
      where: { id: operation.id },
      data: { nextAttemptAt: new Date('2026-01-01T23:59:00Z') },
    });
    await expect(runFinancialOperation(prisma, stripeClient, operation.id, {
      now: new Date('2026-01-02T00:00:00Z'),
    })).rejects.toThrow('exceeded the safe replay window');

    expect(stripeClient.tax.transactions.createFromCalculation).toHaveBeenCalledTimes(2);
    await expect(prisma.financialOperation.findUnique({
      where: { id: operation.id },
      select: { status: true, externalCallStartedAt: true },
    })).resolves.toEqual({ status: 'RECONCILE', externalCallStartedAt: startedAt });
  });

  it('recovers after provider success and local completion failure with one provider result', async () => {
    const variant = await createVariant();
    const order = await reserve(variant, 'pi_tax_completion_retry', {
      orderData: { stripeTaxCalculationId: 'taxcalc_completion_retry' },
    });
    await projectStripeEvent(prisma, {
      id: 'evt_tax_completion_retry',
      type: 'payment_intent.succeeded',
      created: 1789040000,
      data: {
        object: { id: 'pi_tax_completion_retry', amount_received: 4049, currency: 'usd' },
      },
    });
    const operation = await prisma.financialOperation.findFirst({ where: { orderId: order.id } });
    const providerResults = new Map();
    const createFromCalculation = vi.fn().mockImplementation(async (_request, options) => {
      if (!providerResults.has(options.idempotencyKey)) {
        providerResults.set(options.idempotencyKey, { id: 'tax_cached_result' });
      }
      return providerResults.get(options.idempotencyKey);
    });
    const stripeClient = {
      tax: { transactions: { createFromCalculation, createReversal: vi.fn() } },
    };
    const completionFailureDb = {
      financialOperation: prisma.financialOperation,
      order: prisma.order,
      $transaction: vi.fn().mockRejectedValue(new Error('local commit unavailable')),
    };

    await expect(runFinancialOperation(completionFailureDb, stripeClient, operation.id, {
      now: new Date('2026-01-01T00:00:00Z'),
    })).rejects.toThrow('local commit unavailable');
    await prisma.financialOperation.update({
      where: { id: operation.id },
      data: { nextAttemptAt: new Date('2026-01-01T00:01:00Z') },
    });
    await expect(runFinancialOperation(prisma, stripeClient, operation.id, {
      now: new Date('2026-01-01T00:02:00Z'),
    })).resolves.toBe(true);

    expect(createFromCalculation).toHaveBeenCalledTimes(2);
    expect(createFromCalculation.mock.calls[0][1]).toEqual(createFromCalculation.mock.calls[1][1]);
    expect(providerResults.size).toBe(1);
    await expect(prisma.order.findUnique({
      where: { id: order.id },
      select: { stripeTaxTransactionId: true },
    })).resolves.toEqual({ stripeTaxTransactionId: 'tax_cached_result' });
  });

  it('does not release an order while a durable checkout may have a remote intent', async () => {
    const variant = await createVariant({ stock: 2 });
    const key = '123e4567-e89b-42d3-a456-426614174010';
    const payload = { items: [{ variantId: variant.id, quantity: 1 }] };
    const claimed = await claimCheckoutAttempt(prisma, {
      idempotencyKey: key,
      actorScope: 'guest-checkout',
      payload,
      checkoutData: { payload },
      now: new Date('2026-01-01T00:00:00Z'),
    });
    await updateClaimedCheckoutAttempt(prisma, claimed.attempt.id, claimed.leaseToken, {
      status: 'TAX_READY',
      amountCents: 4049,
      currency: 'usd',
      taxCalculationId: 'taxcalc_reserved_attempt',
    });
    await reserveInventoryAndCreateOrder(prisma, {
      checkoutAttemptId: claimed.attempt.id,
      checkoutLeaseToken: claimed.leaseToken,
      orderData: orderData(null, {
        createdAt: new Date('2026-01-01T00:00:00Z'),
        stripeTaxCalculationId: 'taxcalc_reserved_attempt',
      }),
      items: [orderItem(variant)],
    });

    const summary = await cleanupExpiredPendingOrders({
      now: new Date('2026-01-01T01:00:00Z'),
      prismaClient: prisma,
      stripeClient: { paymentIntents: { retrieve: vi.fn(), cancel: vi.fn() } },
    });

    expect(summary.skippedCheckout).toBe(1);
    expect(summary.cancelled).toBe(0);
    await expect(prisma.productVariant.findUnique({
      where: { id: variant.id },
      select: { stock: true },
    })).resolves.toEqual({ stock: 1 });
  });
});

describe('checkout attempt ownership and idempotency', () => {
  it('returns the same attempt for the same actor, key, and canonical payload', async () => {
    const input = {
      idempotencyKey: '123e4567-e89b-42d3-a456-426614174011',
      actorScope: 'guest-checkout',
      payload: { shipping: { zip: '84074', city: 'Tooele' }, items: [1] },
      checkoutData: { snapshot: true },
      now: new Date('2026-01-01T00:00:00Z'),
    };
    const first = await claimCheckoutAttempt(prisma, input);
    await prisma.checkoutAttempt.update({
      where: { id: first.attempt.id },
      data: {
        status: 'READY',
        orderId: null,
        paymentIntentId: 'pi_attempt_ready',
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });

    const second = await claimCheckoutAttempt(prisma, {
      ...input,
      payload: { items: [1], shipping: { city: 'Tooele', zip: '84074' } },
    });
    expect(second.created).toBe(false);
    expect(second.attempt.id).toBe(first.attempt.id);
    expect(second.attempt.paymentIntentId).toBe('pi_attempt_ready');
  });

  it('rejects reuse of a checkout key for changed details', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174012';
    await claimCheckoutAttempt(prisma, {
      idempotencyKey: key,
      actorScope: 'guest-checkout',
      payload: { items: [{ quantity: 1 }] },
      checkoutData: { snapshot: true },
      now: new Date('2026-01-01T00:00:00Z'),
    });

    await expect(claimCheckoutAttempt(prisma, {
      idempotencyKey: key,
      actorScope: 'guest-checkout',
      payload: { items: [{ quantity: 2 }] },
      checkoutData: { snapshot: true },
      now: new Date('2026-01-01T00:10:00Z'),
    })).rejects.toBeInstanceOf(CheckoutAttemptError);
  });
});
