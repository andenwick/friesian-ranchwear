import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelPendingOrderAndRestoreStock,
  markOrderRefunded,
  markPendingOrderPaid,
  reserveInventoryAndCreateOrder,
} from '@/lib/order-lifecycle';
import { cleanupExpiredPendingOrders } from '@/lib/order-reservations';

const prisma = new PrismaClient();

async function resetDatabase() {
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

    await expect(markPendingOrderPaid(prisma, 'pi_paid_wins')).resolves.toBe(true);
    await expect(markPendingOrderPaid(prisma, 'pi_paid_wins')).resolves.toBe(false);
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

    await expect(markPendingOrderPaid(prisma, 'pi_cancelled_success')).rejects.toThrow(
      'attached to CANCELLED order'
    );
  });

  it('projects a full refund once without changing inventory', async () => {
    const variant = await createVariant({ stock: 2 });
    await reserve(variant, 'pi_refund');
    await markPendingOrderPaid(prisma, 'pi_refund');

    await expect(markOrderRefunded(prisma, 'pi_refund')).resolves.toBe(true);
    await expect(markOrderRefunded(prisma, 'pi_refund')).resolves.toBe(false);

    const [order, storedVariant] = await Promise.all([
      prisma.order.findFirst({ where: { stripePaymentId: 'pi_refund' } }),
      prisma.productVariant.findUnique({ where: { id: variant.id } }),
    ]);

    expect(order.status).toBe('REFUNDED');
    expect(storedVariant.stock).toBe(1);
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
    await reserve(variant, 'pi_cleanup_paid', {
      orderData: { createdAt: new Date('2026-01-01T00:00:00Z') },
    });
    const stripeClient = {
      paymentIntents: {
        retrieve: vi.fn().mockResolvedValue({ status: 'succeeded' }),
        cancel: vi.fn(),
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
  });
});
