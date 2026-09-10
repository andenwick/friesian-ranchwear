import { createHash, randomUUID } from 'node:crypto';

const ATTEMPT_LEASE_MS = 5 * 60 * 1000;
const STRIPE_IDEMPOTENCY_REPLAY_MS = 23 * 60 * 60 * 1000;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CheckoutAttemptError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.name = 'CheckoutAttemptError';
    this.status = status;
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function hashCheckoutPayload(payload) {
  return sha256(JSON.stringify(stableValue(payload)));
}

export function validateCheckoutIdempotencyKey(key) {
  if (!UUID_V4.test(key || '')) {
    throw new CheckoutAttemptError('A valid checkout idempotency key is required', 400);
  }
}

export function hashCheckoutAccessKey(key) {
  validateCheckoutIdempotencyKey(key);
  return sha256(key);
}

export async function claimCheckoutAttempt(db, input) {
  validateCheckoutIdempotencyKey(input.idempotencyKey);
  const now = input.now instanceof Date ? input.now : new Date();
  const actorScopeHash = sha256(input.actorScope);
  const keyHash = sha256(input.idempotencyKey);
  const payloadHash = hashCheckoutPayload(input.payload);
  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + ATTEMPT_LEASE_MS);

  let attempt;
  try {
    attempt = await db.checkoutAttempt.create({
      data: {
        actorScopeHash,
        keyHash,
        payloadHash,
        checkoutData: input.checkoutData,
        status: 'INITIALIZING',
        leaseToken,
        leaseExpiresAt,
      },
    });
    return { attempt, leaseToken, created: true };
  } catch (error) {
    if (error?.code !== 'P2002') throw error;
  }

  attempt = await db.checkoutAttempt.findUnique({
    where: { actorScopeHash_keyHash: { actorScopeHash, keyHash } },
  });
  return claimStoredAttempt(db, attempt, payloadHash, now);
}

export async function claimExistingCheckoutAttempt(db, input) {
  validateCheckoutIdempotencyKey(input.idempotencyKey);
  const now = input.now instanceof Date ? input.now : new Date();
  const actorScopeHash = sha256(input.actorScope);
  const keyHash = sha256(input.idempotencyKey);
  const payloadHash = hashCheckoutPayload(input.payload);
  const attempt = await db.checkoutAttempt.findUnique({
    where: { actorScopeHash_keyHash: { actorScopeHash, keyHash } },
  });
  if (!attempt) return null;
  return claimStoredAttempt(db, attempt, payloadHash, now);
}

async function claimStoredAttempt(db, attempt, payloadHash, now) {
  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + ATTEMPT_LEASE_MS);
  if (!attempt) throw new Error('Checkout attempt conflict could not be loaded');
  if (attempt.payloadHash !== payloadHash) {
    throw new CheckoutAttemptError('Checkout key was already used for different details');
  }
  if (attempt.status === 'READY') return { attempt, leaseToken: null, created: false };
  if (attempt.status === 'FAILED' || attempt.status === 'RECONCILE') {
    throw new CheckoutAttemptError('This checkout attempt cannot be resumed safely');
  }
  if (attempt.leaseExpiresAt && attempt.leaseExpiresAt > now) {
    throw new CheckoutAttemptError('Checkout is already being prepared. Retry shortly.');
  }

  const claimed = await db.checkoutAttempt.updateMany({
    where: {
      id: attempt.id,
      status: { in: ['INITIALIZING', 'TAX_READY', 'RESERVED'] },
      OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
    },
    data: { leaseToken, leaseExpiresAt, lastError: null },
  });
  if (claimed.count === 0) {
    throw new CheckoutAttemptError('Checkout is already being prepared. Retry shortly.');
  }

  attempt = await db.checkoutAttempt.findUnique({ where: { id: attempt.id } });
  return { attempt, leaseToken, created: false };
}

export async function updateClaimedCheckoutAttempt(db, attemptId, leaseToken, data) {
  const updated = await db.checkoutAttempt.updateMany({
    where: { id: attemptId, leaseToken },
    data,
  });
  if (updated.count === 0) throw new Error(`Checkout attempt ${attemptId} lost its lease`);
}

export async function prepareCheckoutPaymentCall(db, attemptId, leaseToken, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const attempt = await db.checkoutAttempt.findUnique({
    where: { id: attemptId },
    select: {
      status: true,
      leaseToken: true,
      leaseExpiresAt: true,
      paymentCallStartedAt: true,
    },
  });
  if (
    attempt?.status !== 'RESERVED' ||
    attempt.leaseToken !== leaseToken ||
    !attempt.leaseExpiresAt ||
    attempt.leaseExpiresAt <= now
  ) {
    throw new CheckoutAttemptError('Checkout attempt lost its lease before payment creation');
  }
  if (
    attempt.paymentCallStartedAt &&
    now.getTime() - attempt.paymentCallStartedAt.getTime() > STRIPE_IDEMPOTENCY_REPLAY_MS
  ) {
    await db.checkoutAttempt.updateMany({
      where: { id: attemptId, status: 'RESERVED', leaseToken },
      data: {
        status: 'RECONCILE',
        leaseToken: null,
        leaseExpiresAt: null,
        lastError: 'STRIPE_IDEMPOTENCY_WINDOW_ELAPSED',
      },
    });
    throw new CheckoutAttemptError('Checkout payment requires reconciliation before retry');
  }
  if (!attempt.paymentCallStartedAt) {
    const started = await db.checkoutAttempt.updateMany({
      where: {
        id: attemptId,
        status: 'RESERVED',
        leaseToken,
        leaseExpiresAt: { gt: now },
        paymentCallStartedAt: null,
      },
      data: { paymentCallStartedAt: now },
    });
    if (started.count === 0) {
      throw new CheckoutAttemptError('Checkout attempt lost its lease before payment creation');
    }
  }
}

export async function releaseCheckoutAttempt(db, attemptId, leaseToken, error) {
  await db.checkoutAttempt.updateMany({
    where: { id: attemptId, leaseToken, status: { notIn: ['READY', 'FAILED'] } },
    data: {
      leaseToken: null,
      leaseExpiresAt: null,
      lastError: error instanceof CheckoutAttemptError
        ? 'CHECKOUT_ATTEMPT_CONFLICT'
        : 'CHECKOUT_ATTEMPT_FAILED',
    },
  });
}
