import { createHmac, timingSafeEqual } from 'crypto';

export const RESET_TOKEN_MINUTES = 30;
export const MIN_PASSWORD_LENGTH = 8;

/*
 * Stateless reset tokens: userId.expiresAt.signature, where the signature covers the
 * user's current password hash. Changing the password changes the hash, so a token
 * works once and every older token dies with it. No reset table is needed.
 */

function signature(secret, userId, expiresAt, passwordHash) {
  return createHmac('sha256', secret)
    .update(`password-reset:${userId}:${expiresAt}:${passwordHash}`)
    .digest('base64url');
}

function requireSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 16) {
    throw new Error('Password reset secret is not configured');
  }
}

export function createResetToken(user, secret, now = Date.now()) {
  requireSecret(secret);
  if (!user?.id || !user?.passwordHash) throw new Error('User cannot reset a password');
  const expiresAt = now + RESET_TOKEN_MINUTES * 60 * 1000;
  return `${user.id}.${expiresAt}.${signature(secret, user.id, expiresAt, user.passwordHash)}`;
}

/** Splits a token without trusting it. Returns null for anything malformed. */
export function parseResetToken(token) {
  if (typeof token !== 'string' || token.length > 300) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, sig] = parts;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(userId)) return null;
  if (!/^\d{13}$/.test(expiresRaw)) return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(sig)) return null;
  return { userId, expiresAt: Number(expiresRaw), sig };
}

/** True only when the token was issued for this exact user and password hash and has not expired. */
export function verifyResetToken(parsed, user, secret, now = Date.now()) {
  requireSecret(secret);
  if (!parsed || !user?.id || !user?.passwordHash) return false;
  if (parsed.userId !== user.id) return false;
  if (parsed.expiresAt <= now) return false;
  const expected = Buffer.from(signature(secret, user.id, parsed.expiresAt, user.passwordHash));
  const actual = Buffer.from(parsed.sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
