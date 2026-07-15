import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/stripe', () => ({ stripe: {} }));

import {
  cancelPaymentIntentSafely,
  getPaymentIntentStateFromStatus,
} from '@/lib/order-reservations';

describe('order reservation payment safety', () => {
  it('classifies terminal and in-progress Stripe states', () => {
    expect(getPaymentIntentStateFromStatus('succeeded')).toEqual({ state: 'paid' });
    expect(getPaymentIntentStateFromStatus('processing')).toEqual({ state: 'in_progress' });
    expect(getPaymentIntentStateFromStatus('canceled')).toEqual({ state: 'abandoned' });
  });

  it('rechecks a payment when cancellation loses a race', async () => {
    const stripeClient = {
      paymentIntents: {
        cancel: vi.fn().mockRejectedValue(new Error('already succeeded')),
        retrieve: vi.fn().mockResolvedValue({ status: 'succeeded' }),
      },
    };

    await expect(cancelPaymentIntentSafely('pi_test', stripeClient)).resolves.toEqual({
      state: 'paid',
    });
    expect(stripeClient.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test');
  });
});
