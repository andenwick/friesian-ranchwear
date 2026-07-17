import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cleanupExpiredPendingOrders: vi.fn(),
  getServerSession: vi.fn(),
  rateLimit: vi.fn(),
  reserveInventoryAndCreateOrder: vi.fn(),
  stripe: {
    paymentIntents: {
      cancel: vi.fn(),
      create: vi.fn(),
    },
    tax: {
      calculations: {
        create: vi.fn(),
      },
    },
  },
  prisma: {
    productVariant: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/stripe', () => ({ stripe: mocks.stripe }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('@/lib/rate-limit', () => ({
  getClientIP: () => '127.0.0.1',
  rateLimit: mocks.rateLimit,
}));
vi.mock('@/lib/order-reservations', () => ({
  cleanupExpiredPendingOrders: mocks.cleanupExpiredPendingOrders,
}));
vi.mock('@/lib/order-lifecycle', () => ({
  reserveInventoryAndCreateOrder: mocks.reserveInventoryAndCreateOrder,
}));

import { POST } from '@/app/api/checkout/route';

const validCheckout = {
  items: [
    {
      variantId: 'variant_1',
      quantity: 2,
      name: 'Untrusted client name',
      price: 0.01,
    },
  ],
  customer: {
    email: 'buyer@example.com',
    name: 'Test Buyer',
  },
  shipping: {
    name: 'Test Buyer',
    street: '100 Test Street',
    city: 'Stansbury Park',
    state: 'UT',
    zip: '84074',
  },
};

function checkoutRequest(body = validCheckout) {
  return new Request('http://localhost/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();

  mocks.rateLimit.mockReturnValue({ success: true });
  mocks.getServerSession.mockResolvedValue(null);
  mocks.cleanupExpiredPendingOrders.mockResolvedValue({ checked: 0 });
  mocks.prisma.productVariant.findMany.mockResolvedValue([
    {
      id: 'variant_1',
      size: 'M',
      color: 'Black',
      price: '42.00',
      stock: 5,
      product: {
        id: 'product_1',
        name: 'Database Product',
        basePrice: '50.00',
        active: true,
      },
    },
  ]);
  mocks.stripe.tax.calculations.create.mockResolvedValue({ tax_amount_exclusive: 250 });
  mocks.stripe.paymentIntents.create.mockResolvedValue({
    id: 'pi_checkout',
    client_secret: 'pi_checkout_secret',
  });
  mocks.stripe.paymentIntents.cancel.mockResolvedValue({ status: 'canceled' });
  mocks.reserveInventoryAndCreateOrder.mockResolvedValue({ id: 'order_1' });
});

describe('POST /api/checkout', () => {
  it('rejects an invalid shipping address before database or provider work', async () => {
    const response = await POST(
      checkoutRequest({
        ...validCheckout,
        shipping: { ...validCheckout.shipping, zip: 'not-a-zip' },
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid ZIP code format' });
    expect(mocks.prisma.productVariant.findMany).not.toHaveBeenCalled();
    expect(mocks.stripe.tax.calculations.create).not.toHaveBeenCalled();
  });

  it('uses database price and product snapshots instead of client cart fields', async () => {
    const response = await POST(checkoutRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      clientSecret: 'pi_checkout_secret',
      orderId: 'order_1',
      subtotal: 84,
      shipping: 0,
      tax: 2.5,
      total: 86.5,
    });
    expect(mocks.stripe.tax.calculations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({ amount: 8400, reference: 'variant_1' }),
        ],
      })
    );
    expect(mocks.stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 8650, currency: 'usd' })
    );
    expect(mocks.reserveInventoryAndCreateOrder).toHaveBeenCalledWith(mocks.prisma, {
      orderData: expect.objectContaining({
        status: 'PENDING',
        subtotal: 84,
        shipping: 0,
        tax: 2.5,
        total: 86.5,
        stripePaymentId: 'pi_checkout',
      }),
      items: [
        {
          variantId: 'variant_1',
          quantity: 2,
          unitPrice: 42,
          productName: 'Database Product',
          size: 'M',
          color: 'Black',
        },
      ],
    });
  });

  it('does not create a PaymentIntent when Stripe Tax fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.stripe.tax.calculations.create.mockRejectedValue(new Error('tax unavailable'));

    const response = await POST(checkoutRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Unable to calculate tax. Please try again or contact support.',
    });
    expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(mocks.reserveInventoryAndCreateOrder).not.toHaveBeenCalled();
  });

  it('cancels the PaymentIntent when the database reservation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.reserveInventoryAndCreateOrder.mockRejectedValue(new Error('insufficient stock race'));

    const response = await POST(checkoutRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to process checkout. Please try again.',
    });
    expect(mocks.stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_checkout');
  });
});
