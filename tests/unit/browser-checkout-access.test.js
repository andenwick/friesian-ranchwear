import { webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  getOrCreateCheckoutKey,
  loadGuestOrderAccess,
  retireActiveCheckoutKey,
  shouldClearCartForOrderStatus,
  storeGuestOrderAccess,
} from '@/lib/browser-checkout-access';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    values,
  };
}

describe('browser checkout continuity', () => {
  it('reuses the pre-request key after a reload without persisting payload PII', async () => {
    const storage = memoryStorage();
    const cryptoApi = { subtle: webcrypto.subtle, randomUUID: vi.fn(() => 'key-1') };
    const payload = { customer: { email: 'private@example.com' }, items: [{ id: 'v1' }] };

    const first = await getOrCreateCheckoutKey(storage, payload, cryptoApi, 1000);
    const afterReload = await getOrCreateCheckoutKey(storage, payload, cryptoApi, 2000);

    expect(first).toBe('key-1');
    expect(afterReload).toBe('key-1');
    expect(cryptoApi.randomUUID).toHaveBeenCalledOnce();
    expect(storage.values.get('checkout-attempt:active')).not.toContain('private@example.com');
  });

  it('keeps guest access for 30 days and expires it in the browser', () => {
    const storage = memoryStorage();
    storeGuestOrderAccess(storage, 'order_1', 'key-1', 1000);

    expect(loadGuestOrderAccess(storage, 'order_1', 2000)).toBe('key-1');
    expect(loadGuestOrderAccess(storage, 'order_1', 1000 + 31 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  it('keeps the active attempt through payment and retires it only at terminal status', async () => {
    const storage = memoryStorage();
    const cryptoApi = { subtle: webcrypto.subtle, randomUUID: vi.fn(() => 'key-1') };
    const payload = { items: [{ id: 'v1' }] };
    await getOrCreateCheckoutKey(storage, payload, cryptoApi, 1000);
    storeGuestOrderAccess(storage, 'order_1', 'key-1', 2000);

    expect(storage.values.has('checkout-attempt:active')).toBe(true);
    retireActiveCheckoutKey(storage, 'another-key');
    expect(storage.values.has('checkout-attempt:active')).toBe(true);
    retireActiveCheckoutKey(storage, 'key-1');
    expect(storage.values.has('checkout-attempt:active')).toBe(false);
  });

  it('does not bypass server reconciliation by rotating an old identical key', async () => {
    const storage = memoryStorage();
    const cryptoApi = { subtle: webcrypto.subtle, randomUUID: vi.fn(() => 'key-1') };
    const payload = { items: [{ id: 'v1' }] };
    await getOrCreateCheckoutKey(storage, payload, cryptoApi, 1000);
    const afterTwoDays = await getOrCreateCheckoutKey(
      storage,
      payload,
      cryptoApi,
      1000 + 48 * 60 * 60 * 1000
    );

    expect(afterTwoDays).toBe('key-1');
    expect(cryptoApi.randomUUID).toHaveBeenCalledOnce();
  });

  it('preserves the cart while pending and when pending later becomes cancelled', () => {
    expect(shouldClearCartForOrderStatus('PENDING')).toBe(false);
    expect(shouldClearCartForOrderStatus('CANCELLED')).toBe(false);
    expect(shouldClearCartForOrderStatus('PAID')).toBe(true);
  });
});
