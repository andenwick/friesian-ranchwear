import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/stripe', () => ({ stripe: {} }));

import {
  cancelPaymentIntentSafely,
  cleanupExpiredPendingOrders,
  getPaymentIntentStateFromStatus,
} from '@/lib/order-reservations';

describe('order reservation payment safety', () => {
  it('classifies terminal and in-progress Stripe states', () => {
    expect(getPaymentIntentStateFromStatus('succeeded')).toEqual({ state: 'paid' });
    expect(getPaymentIntentStateFromStatus('processing')).toEqual({ state: 'in_progress' });
    expect(getPaymentIntentStateFromStatus('canceled')).toEqual({ state: 'canceled' });
    expect(getPaymentIntentStateFromStatus('requires_payment_method')).toEqual({
      state: 'cancellable',
    });
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
      paymentIntent: { status: 'succeeded' },
    });
    expect(stripeClient.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test');
  });

  it.each(['requires_payment_method', 'requires_confirmation', 'requires_action'])(
    'does not release inventory when cancellation fails and Stripe still reports %s',
    async (status) => {
      const prismaClient = {
        order: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'order_1', stripePaymentId: 'pi_test' },
          ]),
          updateMany: vi.fn(),
        },
        $transaction: vi.fn(),
      };
      const stripeClient = {
        paymentIntents: {
          retrieve: vi.fn().mockResolvedValue({ status }),
          cancel: vi.fn().mockRejectedValue(new Error('cancellation not confirmed')),
        },
      };

      const summary = await cleanupExpiredPendingOrders({
        prismaClient,
        stripeClient,
        now: new Date('2026-01-01T01:00:00Z'),
      });

      expect(summary.cancelled).toBe(0);
      expect(summary.skippedCancellable).toBe(1);
      expect(prismaClient.$transaction).not.toHaveBeenCalled();
    }
  );

  it('releases inventory after Stripe confirms cancellation', async () => {
    const prismaClient = {
      order: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'order_1', stripePaymentId: 'pi_test' },
        ]),
      },
      $transaction: vi.fn().mockImplementation(async (operation) => operation({
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        orderItem: { findMany: vi.fn().mockResolvedValue([]) },
        productVariant: { update: vi.fn() },
      })),
    };
    const stripeClient = {
      paymentIntents: {
        retrieve: vi.fn().mockResolvedValue({ status: 'requires_payment_method' }),
        cancel: vi.fn().mockResolvedValue({ status: 'canceled' }),
      },
    };

    const summary = await cleanupExpiredPendingOrders({
      prismaClient,
      stripeClient,
      now: new Date('2026-01-01T01:00:00Z'),
    });

    expect(summary.cancelled).toBe(1);
    expect(stripeClient.paymentIntents.cancel).toHaveBeenCalledWith('pi_test');
  });
});
