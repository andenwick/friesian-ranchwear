import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cleanupExpiredPendingOrders: vi.fn(),
  getServerSession: vi.fn(),
  rateLimit: vi.fn(),
  reserveInventoryAndCreateOrder: vi.fn(),
  claimCheckoutAttempt: vi.fn(),
  claimExistingCheckoutAttempt: vi.fn(),
  releaseCheckoutAttempt: vi.fn(),
  prepareCheckoutPaymentCall: vi.fn(),
  updateClaimedCheckoutAttempt: vi.fn(),
  stripe: {
    paymentIntents: {
      cancel: vi.fn(),
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    tax: {
      calculations: {
        create: vi.fn(),
      },
    },
  },
  prisma: {
    $transaction: vi.fn(),
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
vi.mock('@/lib/checkout-attempts', () => ({
  CheckoutAttemptError: class CheckoutAttemptError extends Error {},
  claimCheckoutAttempt: mocks.claimCheckoutAttempt,
  claimExistingCheckoutAttempt: mocks.claimExistingCheckoutAttempt,
  releaseCheckoutAttempt: mocks.releaseCheckoutAttempt,
  prepareCheckoutPaymentCall: mocks.prepareCheckoutPaymentCall,
  updateClaimedCheckoutAttempt: mocks.updateClaimedCheckoutAttempt,
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

function checkoutRequest(body = validCheckout, idempotencyKey = '123e4567-e89b-42d3-a456-426614174000') {
  return new Request('http://localhost/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();

  mocks.rateLimit.mockReturnValue({ success: true });
  mocks.getServerSession.mockResolvedValue(null);
  mocks.cleanupExpiredPendingOrders.mockResolvedValue({ checked: 0 });
  mocks.claimCheckoutAttempt.mockImplementation(async (_db, input) => ({
    attempt: {
      id: 'attempt_1',
      status: 'INITIALIZING',
      checkoutData: input.checkoutData,
    },
    leaseToken: 'lease_1',
    created: true,
  }));
  mocks.claimExistingCheckoutAttempt.mockResolvedValue(null);
  mocks.updateClaimedCheckoutAttempt.mockResolvedValue();
  mocks.releaseCheckoutAttempt.mockResolvedValue();
  mocks.prepareCheckoutPaymentCall.mockResolvedValue();
  mocks.prisma.$transaction.mockImplementation(async (operation) => operation({
    order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    checkoutAttempt: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  }));
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
  mocks.stripe.tax.calculations.create.mockResolvedValue({
    id: 'taxcalc_checkout',
    tax_amount_exclusive: 250,
    amount_total: 8650,
  });
  mocks.stripe.paymentIntents.create.mockResolvedValue({
    id: 'pi_checkout',
    client_secret: 'pi_checkout_secret',
  });
  mocks.stripe.paymentIntents.retrieve.mockResolvedValue({
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
      }),
      { idempotencyKey: 'checkout-tax:attempt_1' }
    );
    expect(mocks.stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 8650,
        currency: 'usd',
        metadata: { orderId: 'order_1', taxCalculationId: 'taxcalc_checkout' },
      }),
      { idempotencyKey: 'checkout-payment:attempt_1' }
    );
    expect(mocks.reserveInventoryAndCreateOrder).toHaveBeenCalledWith(mocks.prisma, {
      orderData: expect.objectContaining({
        status: 'PENDING',
        subtotal: 84,
        shipping: 0,
        tax: 2.5,
        total: 86.5,
        paymentStatus: 'PENDING',
        paymentAmountCents: 8650,
        paymentCurrency: 'usd',
        amountRefundedCents: 0,
        stripeTaxCalculationId: 'taxcalc_checkout',
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
      checkoutAttemptId: 'attempt_1',
      checkoutLeaseToken: 'lease_1',
    });
  });

  it('does not create a PaymentIntent when Stripe Tax fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.stripe.tax.calculations.create.mockRejectedValue(new Error('tax unavailable'));

    const response = await POST(checkoutRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to process checkout. Please try again.',
    });
    expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(mocks.reserveInventoryAndCreateOrder).not.toHaveBeenCalled();
  });

  it('does not create or cancel a PaymentIntent when the database reservation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.reserveInventoryAndCreateOrder.mockRejectedValue(new Error('insufficient stock race'));

    const response = await POST(checkoutRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to process checkout. Please try again.',
    });
    expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(mocks.stripe.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(mocks.releaseCheckoutAttempt).toHaveBeenCalled();
  });

  it('returns the original order and intent for a completed retry', async () => {
    mocks.claimExistingCheckoutAttempt.mockResolvedValue({
      attempt: {
        id: 'attempt_ready',
        status: 'READY',
        orderId: 'order_ready',
        paymentIntentId: 'pi_checkout',
        checkoutData: {
          totals: { subtotal: 84, shipping: 0, tax: 2.5, total: 86.5 },
        },
      },
      leaseToken: null,
      created: false,
    });

    const response = await POST(checkoutRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      clientSecret: 'pi_checkout_secret',
      orderId: 'order_ready',
      subtotal: 84,
      shipping: 0,
      tax: 2.5,
      total: 86.5,
    });
    expect(mocks.stripe.tax.calculations.create).not.toHaveBeenCalled();
    expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(mocks.reserveInventoryAndCreateOrder).not.toHaveBeenCalled();
  });

  it('returns a concurrently completed attempt found during create conflict recovery', async () => {
    mocks.claimExistingCheckoutAttempt.mockResolvedValue(null);
    mocks.claimCheckoutAttempt.mockResolvedValue({
      attempt: {
        id: 'attempt_raced_ready',
        status: 'READY',
        orderId: 'order_raced_ready',
        paymentIntentId: 'pi_checkout',
        checkoutData: {
          totals: { subtotal: 84, shipping: 0, tax: 2.5, total: 86.5 },
        },
      },
      leaseToken: null,
      created: false,
    });

    const response = await POST(checkoutRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      clientSecret: 'pi_checkout_secret',
      orderId: 'order_raced_ready',
      total: 86.5,
    });
    expect(mocks.stripe.tax.calculations.create).not.toHaveBeenCalled();
    expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(mocks.reserveInventoryAndCreateOrder).not.toHaveBeenCalled();
  });

  it('never cancels a successful remote intent when local finalization fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.prisma.$transaction.mockRejectedValue(new Error('database unavailable after provider success'));

    const response = await POST(checkoutRequest());

    expect(response.status).toBe(500);
    expect(mocks.stripe.paymentIntents.create).toHaveBeenCalledOnce();
    expect(mocks.stripe.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(mocks.releaseCheckoutAttempt).toHaveBeenCalledWith(
      mocks.prisma,
      'attempt_1',
      'lease_1',
      expect.any(Error)
    );
  });

  it('resumes the frozen last-unit reservation after a lost response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const successfulTransaction = async (operation) => operation({
      order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      checkoutAttempt: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    });
    mocks.prisma.$transaction
      .mockRejectedValueOnce(new Error('response lost after provider success'))
      .mockImplementation(successfulTransaction);

    const firstResponse = await POST(checkoutRequest());
    expect(firstResponse.status).toBe(500);

    mocks.claimExistingCheckoutAttempt.mockResolvedValue({
      attempt: {
        id: 'attempt_1',
        status: 'RESERVED',
        orderId: 'order_1',
        amountCents: 8650,
        currency: 'usd',
        taxCalculationId: 'taxcalc_checkout',
        checkoutData: {
          totals: { subtotal: 84, shipping: 0, tax: 2.5, total: 86.5 },
        },
      },
      leaseToken: 'lease_2',
      created: false,
    });
    mocks.prisma.productVariant.findMany.mockResolvedValue([]);

    const retryResponse = await POST(checkoutRequest());

    expect(retryResponse.status).toBe(200);
    expect(mocks.prisma.productVariant.findMany).toHaveBeenCalledOnce();
    expect(mocks.reserveInventoryAndCreateOrder).toHaveBeenCalledOnce();
    expect(mocks.stripe.paymentIntents.create).toHaveBeenCalledTimes(2);
    expect(mocks.stripe.paymentIntents.create.mock.calls[0][1]).toEqual(
      mocks.stripe.paymentIntents.create.mock.calls[1][1]
    );
    expect(mocks.stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });
});
