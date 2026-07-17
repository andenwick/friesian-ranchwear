import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cancelPendingOrderAndRestoreStock: vi.fn(),
  markOrderRefunded: vi.fn(),
  markPendingOrderPaid: vi.fn(),
  prisma: { marker: 'prisma-client' },
  constructEvent: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: mocks.constructEvent },
  },
}));
vi.mock('@/lib/order-lifecycle', () => ({
  cancelPendingOrderAndRestoreStock: mocks.cancelPendingOrderAndRestoreStock,
  markOrderRefunded: mocks.markOrderRefunded,
  markPendingOrderPaid: mocks.markPendingOrderPaid,
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
  mocks.cancelPendingOrderAndRestoreStock.mockResolvedValue(true);
  mocks.markOrderRefunded.mockResolvedValue(true);
  mocks.markPendingOrderPaid.mockResolvedValue(true);
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
    expect(mocks.markPendingOrderPaid).not.toHaveBeenCalled();
    expect(mocks.constructEvent).toHaveBeenCalledWith(
      '{"event":"test"}',
      'test_signature',
      'whsec_test_only'
    );
  });

  it('maps a successful PaymentIntent to the paid projection', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mocks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_paid' } },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.markPendingOrderPaid).toHaveBeenCalledWith(mocks.prisma, 'pi_paid');
  });

  it.each(['payment_intent.payment_failed', 'payment_intent.canceled'])(
    'maps %s to cancellation and stock restoration',
    async (type) => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      mocks.constructEvent.mockReturnValue({
        type,
        data: { object: { id: 'pi_cancel' } },
      });

      const response = await POST(webhookRequest());

      expect(response.status).toBe(200);
      expect(mocks.cancelPendingOrderAndRestoreStock).toHaveBeenCalledWith(
        mocks.prisma,
        'pi_cancel'
      );
    }
  );

  it('maps a fully refunded charge to the refund projection', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mocks.constructEvent.mockReturnValue({
      type: 'charge.refunded',
      data: { object: { refunded: true, payment_intent: 'pi_refunded' } },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.markOrderRefunded).toHaveBeenCalledWith(mocks.prisma, 'pi_refunded');
  });

  it('returns 500 so Stripe retries when lifecycle processing fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mocks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_retry' } },
    });
    mocks.markPendingOrderPaid.mockRejectedValue(new Error('database unavailable'));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Webhook processing failed' });
  });
});
