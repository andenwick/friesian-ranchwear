import { describe, expect, it, vi } from 'vitest';

import { runFinancialOperation } from '@/lib/financial-operations';

describe('financial operation leases', () => {
  it('does not call Stripe after the claimed lease is expired', async () => {
    const operation = {
      id: 'operation_1',
      orderId: 'order_1',
      kind: 'COMMIT_TAX',
      status: 'PENDING',
      reference: 'tax-sale:order_1',
      requestData: { calculation: 'taxcalc_1', reference: 'tax-sale:order_1' },
      externalCallStartedAt: null,
    };
    let claimedToken;
    let findCount = 0;
    const db = {
      financialOperation: {
        findUnique: vi.fn().mockImplementation(async () => {
          findCount += 1;
          if (findCount === 1) return operation;
          if (findCount === 2) return { ...operation, status: 'PROCESSING' };
          return {
            status: 'PROCESSING',
            leaseToken: claimedToken,
            leaseExpiresAt: new Date('2026-01-01T00:00:00Z'),
            externalCallStartedAt: null,
          };
        }),
        updateMany: vi.fn().mockImplementation(async (input) => {
          if (input.data.leaseToken) claimedToken = input.data.leaseToken;
          return { count: 1 };
        }),
      },
    };
    const stripeClient = {
      tax: {
        transactions: {
          createFromCalculation: vi.fn(),
          createReversal: vi.fn(),
        },
      },
    };

    await expect(runFinancialOperation(db, stripeClient, operation.id, {
      now: new Date('2026-01-01T00:01:00Z'),
    })).rejects.toThrow('lost its lease before provider call');
    expect(stripeClient.tax.transactions.createFromCalculation).not.toHaveBeenCalled();
  });
});
