const ACTIVE_CHECKOUT_KEY = 'checkout-attempt:active';
const GUEST_ACCESS_MS = 30 * 24 * 60 * 60 * 1000;

async function fingerprint(payload, cryptoApi) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function getOrCreateCheckoutKey(storage, payload, cryptoApi, now = Date.now()) {
  const payloadHash = await fingerprint(payload, cryptoApi);
  let stored = null;
  try {
    stored = JSON.parse(storage.getItem(ACTIVE_CHECKOUT_KEY));
  } catch {}

  if (
    stored?.payloadHash === payloadHash &&
    typeof stored?.key === 'string' &&
    Number.isFinite(stored?.createdAt)
  ) {
    return stored.key;
  }

  const key = cryptoApi.randomUUID();
  storage.setItem(ACTIVE_CHECKOUT_KEY, JSON.stringify({ key, payloadHash, createdAt: now }));
  return key;
}

export function storeGuestOrderAccess(storage, orderId, key, now = Date.now()) {
  storage.setItem(
    `order-access:${orderId}`,
    JSON.stringify({ key, expiresAt: now + GUEST_ACCESS_MS })
  );
}

export function retireActiveCheckoutKey(storage, key) {
  try {
    const stored = JSON.parse(storage.getItem(ACTIVE_CHECKOUT_KEY));
    if (stored?.key === key) storage.removeItem(ACTIVE_CHECKOUT_KEY);
  } catch {}
}

export function retireConfirmedCanceledCheckout(storage, key, responseBody) {
  if (responseBody?.code !== 'CHECKOUT_RESTART_REQUIRED') return false;
  retireActiveCheckoutKey(storage, key);
  return true;
}

export function loadGuestOrderAccess(storage, orderId, now = Date.now()) {
  const storageKey = `order-access:${orderId}`;
  try {
    const stored = JSON.parse(storage.getItem(storageKey));
    if (stored?.key && stored.expiresAt > now) return stored.key;
  } catch {}
  storage.removeItem(storageKey);
  return null;
}

export function shouldClearCartForOrderStatus(status) {
  return !['PENDING', 'CANCELLED'].includes(status);
}
