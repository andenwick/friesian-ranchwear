import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  drainOrderFinancialOperations: vi.fn(),
  projectStripeEvent: vi.fn(),
  recordStripeEventFailure: vi.fn(),
  prisma: { marker: 'prisma-client' },
  constructEvent: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: mocks.constructEvent },
  },
}));
vi.mock('@/lib/financial-operations', () => ({
  drainOrderFinancialOperations: mocks.drainOrderFinancialOperations,
}));
vi.mock('@/lib/stripe-event-ledger', () => ({
  projectStripeEvent: mocks.projectStripeEvent,
  recordStripeEventFailure: mocks.recordStripeEventFailure,
}));

import { POST } from '@/app/api/webhooks/stripe/route';

function webhookRequest({ signature = 'test_signature', body = '{"event":"test"}' } = {}) {
  const headers = signature ? { 'stripe-signature': signature } : {};
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_only';
  mocks.projectStripeEvent.mockResolvedValue({ duplicate: false, orderId: 'order_1' });
  mocks.recordStripeEventFailure.mockResolvedValue();
  mocks.drainOrderFinancialOperations.mockResolvedValue();
});

describe('POST /api/webhooks/stripe', () => {
  it('rejects requests without a Stripe signature', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(webhookRequest({ signature: null }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing signature' });
    expect(mocks.constructEvent).not.toHaveBeenCalled();
  });

  it('rejects an invalid signature before lifecycle work', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid signature' });
    expect(mocks.projectStripeEvent).not.toHaveBeenCalled();
    expect(mocks.constructEvent).toHaveBeenCalledWith(
      '{"event":"test"}',
      'test_signature',
      'whsec_test_only'
    );
  });

  it('maps a successful PaymentIntent to the paid projection', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const paymentIntent = { id: 'pi_paid', amount_received: 4049, currency: 'usd' };
    mocks.constructEvent.mockReturnValue({
      id: 'evt_paid',
      type: 'payment_intent.succeeded',
      data: { object: paymentIntent },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.projectStripeEvent).toHaveBeenCalledWith(
      mocks.prisma,
      expect.objectContaining({ type: 'payment_intent.succeeded', data: { object: paymentIntent } })
    );
    expect(mocks.drainOrderFinancialOperations).toHaveBeenCalledWith(
      mocks.prisma,
      expect.any(Object),
      'order_1'
    );
  });

  it('keeps a failed PaymentIntent pending so the same intent can be retried', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mocks.constructEvent.mockReturnValue({
      id: 'evt_failed',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_retryable' } },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.projectStripeEvent).toHaveBeenCalledWith(
      mocks.prisma,
      expect.objectContaining({ type: 'payment_intent.payment_failed' })
    );
  });

  it('allows a failed attempt to succeed later on the same PaymentIntent', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const succeededIntent = {
      id: 'pi_retry_then_paid',
      amount_received: 4049,
      currency: 'usd',
    };
    mocks.constructEvent
      .mockReturnValueOnce({
        id: 'evt_retry_failed',
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_retry_then_paid' } },
      })
      .mockReturnValueOnce({
        id: 'evt_retry_paid',
        type: 'payment_intent.succeeded',
        data: { object: succeededIntent },
      });

    const failedResponse = await POST(webhookRequest());
    const paidResponse = await POST(webhookRequest());

    expect(failedResponse.status).toBe(200);
    expect(paidResponse.status).toBe(200);
    expect(mocks.projectStripeEvent).toHaveBeenCalledTimes(2);
  });

  it('restocks only when Stripe cancels the PaymentIntent', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mocks.constructEvent.mockReturnValue({
      id: 'evt_cancel',
      type: 'payment_intent.canceled',
      data: { object: { id: 'pi_cancel' } },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.projectStripeEvent).toHaveBeenCalledWith(
      mocks.prisma,
      expect.objectContaining({ type: 'payment_intent.canceled' })
    );
  });

  it('maps a fully refunded charge to the refund projection', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const charge = {
      refunded: true,
      payment_intent: 'pi_refunded',
      amount_refunded: 4049,
      currency: 'usd',
    };
    mocks.constructEvent.mockReturnValue({
      id: 'evt_refund',
      type: 'charge.refunded',
      data: { object: charge },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.projectStripeEvent).toHaveBeenCalledWith(
      mocks.prisma,
      expect.objectContaining({ type: 'charge.refunded', data: { object: charge } })
    );
  });

  it('returns 500 so Stripe retries when lifecycle processing fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mocks.constructEvent.mockReturnValue({
      id: 'evt_retry',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_retry' } },
    });
    mocks.projectStripeEvent.mockRejectedValue(new Error('database unavailable'));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Webhook processing failed' });
    expect(mocks.recordStripeEventFailure).toHaveBeenCalledWith(
      mocks.prisma,
      expect.objectContaining({ id: 'evt_retry', type: 'payment_intent.succeeded' }),
      expect.any(Error)
    );
  });
});
