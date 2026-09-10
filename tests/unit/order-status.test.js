import { describe, expect, it } from 'vitest';

import {
  canAdminTransitionOrder,
  getAllowedAdminOrderTransitions,
} from '@/lib/order-status';

describe('admin order transitions', () => {
  it('allows only the forward fulfillment graph', () => {
    expect(getAllowedAdminOrderTransitions('PAID')).toEqual(['PROCESSING']);
    expect(getAllowedAdminOrderTransitions('PROCESSING')).toEqual(['SHIPPED']);
    expect(getAllowedAdminOrderTransitions('SHIPPED')).toEqual(['DELIVERED']);
    expect(canAdminTransitionOrder('PAID', 'PROCESSING')).toBe(true);
  });

  it('denies financial, backwards, and terminal transitions', () => {
    expect(canAdminTransitionOrder('PENDING', 'PAID')).toBe(false);
    expect(canAdminTransitionOrder('PAID', 'REFUNDED')).toBe(false);
    expect(canAdminTransitionOrder('PAID', 'PROCESSING', 'UNKNOWN')).toBe(false);
    expect(canAdminTransitionOrder('PAID', 'PROCESSING', 'REFUNDED')).toBe(false);
    expect(canAdminTransitionOrder('PROCESSING', 'PAID')).toBe(false);
    expect(canAdminTransitionOrder('DELIVERED', 'SHIPPED')).toBe(false);
    expect(getAllowedAdminOrderTransitions('REFUNDED')).toEqual([]);
  });
});
