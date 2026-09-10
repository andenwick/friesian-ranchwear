import { describe, expect, it, vi } from 'vitest';

import { markOrderRefunded } from '@/lib/order-lifecycle';

describe('order lifecycle compare-and-set behavior', () => {
  it('does not overwrite a concurrent fulfillment or payment transition', async () => {
    const db = {
      order: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({
            id: 'order_1',
            status: 'PROCESSING',
            paymentStatus: 'PAID',
            paymentAmountCents: 4049,
            paymentCurrency: 'usd',
            amountRefundedCents: 0,
          })
          .mockResolvedValueOnce({
            id: 'order_1',
            status: 'PROCESSING',
            paymentStatus: 'PARTIALLY_REFUNDED',
            paymentAmountCents: 4049,
            paymentCurrency: 'usd',
            amountRefundedCents: 1200,
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    await expect(markOrderRefunded(db, {
      payment_intent: 'pi_race',
      amount_refunded: 1200,
      currency: 'usd',
    })).resolves.toEqual({ changed: false, orderId: 'order_1', amountApplied: 0 });

    expect(db.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'order_1',
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        amountRefundedCents: 0,
      },
    }));
  });
});
