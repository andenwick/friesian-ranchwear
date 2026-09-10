import { createHash, randomUUID } from 'node:crypto';

const OPERATION_LEASE_MS = 5 * 60 * 1000;
const STRIPE_IDEMPOTENCY_REPLAY_MS = 23 * 60 * 60 * 1000;

function hashRequest(requestData) {
  return createHash('sha256').update(JSON.stringify(requestData)).digest('hex');
}

export async function enqueueTaxCommit(tx, order) {
  if (!order.stripeTaxCalculationId) {
    throw new Error(`Order ${order.id} has no Stripe Tax calculation to commit`);
  }

  const reference = `tax-sale:${order.id}`;
  const requestData = {
    calculation: order.stripeTaxCalculationId,
    reference,
  };
  return upsertImmutableOperation(tx, {
    orderId: order.id,
    kind: 'COMMIT_TAX',
    reference,
    requestData,
  });
}

export async function enqueueTaxReversal(tx, order, charge, amountToReverse) {
  if (!Number.isInteger(amountToReverse) || amountToReverse <= 0) {
    throw new Error(`Order ${order.id} has an invalid tax reversal amount`);
  }

  const reference = `tax-refund:${charge.id}:${charge.amount_refunded}`;
  const requestData = {
    mode: 'partial',
    reference,
    flat_amount: -amountToReverse,
  };
  return upsertImmutableOperation(tx, {
    orderId: order.id,
    kind: 'REVERSE_TAX_PARTIAL',
    reference,
    requestData,
  });
}

async function upsertImmutableOperation(tx, operation) {
  const requestHash = hashRequest(operation.requestData);
  const stored = await tx.financialOperation.upsert({
    where: { reference: operation.reference },
    update: {},
    create: { ...operation, requestHash },
  });

  if (stored.requestHash !== requestHash) {
    throw new Error(`Financial operation ${operation.reference} changed after creation`);
  }

  return stored;
}

async function claimOperation(db, operationId, now) {
  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + OPERATION_LEASE_MS);
  const claimed = await db.financialOperation.updateMany({
    where: {
      id: operationId,
      OR: [
        { status: 'PENDING' },
        {
          status: 'RETRY',
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
        { status: 'PROCESSING', leaseExpiresAt: { lt: now } },
      ],
    },
    data: {
      status: 'PROCESSING',
      attempts: { increment: 1 },
      lastAttemptAt: now,
      leaseToken,
      leaseExpiresAt,
      lastError: null,
    },
  });
  return claimed.count > 0 ? leaseToken : null;
}

export async function runFinancialOperation(db, stripeClient, operationId, options = {}) {
  const clock = typeof options.clock === 'function'
    ? options.clock
    : () => (options.now instanceof Date ? options.now : new Date());
  const now = clock();
  let operation = await db.financialOperation.findUnique({ where: { id: operationId } });
  if (!operation || operation.status === 'SUCCEEDED') return false;
  if (operation.status === 'RECONCILE') {
    throw new Error(`Financial operation ${operation.reference} requires reconciliation`);
  }

  if (
    operation.externalCallStartedAt &&
    now.getTime() - operation.externalCallStartedAt.getTime() > STRIPE_IDEMPOTENCY_REPLAY_MS
  ) {
    await db.financialOperation.updateMany({
      where: { id: operation.id, status: { not: 'SUCCEEDED' } },
      data: {
        status: 'RECONCILE',
        leaseExpiresAt: null,
        lastError: 'STRIPE_IDEMPOTENCY_WINDOW_ELAPSED',
      },
    });
    throw new Error(`Financial operation ${operation.reference} exceeded the safe replay window`);
  }

  const leaseToken = await claimOperation(db, operation.id, now);
  if (!leaseToken) {
    throw new Error(`Financial operation ${operation.reference} is unresolved but not claimable`);
  }
  operation = await db.financialOperation.findUnique({ where: { id: operation.id } });

  try {
    let providerResult;
    if (operation.kind === 'COMMIT_TAX') {
      await prepareExternalCall(db, operation, leaseToken, clock());
      providerResult = await stripeClient.tax.transactions.createFromCalculation(
        operation.requestData,
        { idempotencyKey: operation.reference }
      );
    } else {
      const order = await db.order.findUnique({
        where: { id: operation.orderId },
        select: { stripeTaxTransactionId: true },
      });
      if (!order?.stripeTaxTransactionId) {
        throw new Error(`Tax sale for order ${operation.orderId} is not committed yet`);
      }
      await prepareExternalCall(db, operation, leaseToken, clock());
      providerResult = await stripeClient.tax.transactions.createReversal(
        {
          ...operation.requestData,
          original_transaction: order.stripeTaxTransactionId,
        },
        { idempotencyKey: operation.reference }
      );
    }

    await db.$transaction(async (tx) => {
      const completed = await tx.financialOperation.updateMany({
        where: { id: operation.id, status: 'PROCESSING', leaseToken },
        data: {
          status: 'SUCCEEDED',
          providerObjectId: providerResult.id,
          leaseToken: null,
          leaseExpiresAt: null,
          nextAttemptAt: null,
          lastError: null,
        },
      });
      if (completed.count === 0) {
        throw new Error(`Financial operation ${operation.reference} lost its lease`);
      }
      if (operation.kind === 'COMMIT_TAX') {
        await tx.order.update({
          where: { id: operation.orderId },
          data: { stripeTaxTransactionId: providerResult.id },
        });
      }
    });
    return true;
  } catch (error) {
    const failureTime = clock();
    await db.financialOperation.updateMany({
      where: { id: operation.id, status: 'PROCESSING', leaseToken },
      data: {
        status: 'RETRY',
        leaseToken: null,
        leaseExpiresAt: null,
        nextAttemptAt: new Date(failureTime.getTime() + 60 * 1000),
        lastError: 'FINANCIAL_OPERATION_FAILED',
      },
    });
    throw error;
  }
}

async function prepareExternalCall(db, operation, leaseToken, now) {
  let current = await db.financialOperation.findUnique({
    where: { id: operation.id },
    select: {
      status: true,
      leaseToken: true,
      leaseExpiresAt: true,
      externalCallStartedAt: true,
    },
  });
  if (
    current?.status !== 'PROCESSING' ||
    current.leaseToken !== leaseToken ||
    !current.leaseExpiresAt ||
    current.leaseExpiresAt <= now
  ) {
    throw new Error(`Financial operation ${operation.reference} lost its lease before provider call`);
  }

  if (
    current.externalCallStartedAt &&
    now.getTime() - current.externalCallStartedAt.getTime() > STRIPE_IDEMPOTENCY_REPLAY_MS
  ) {
    await db.financialOperation.updateMany({
      where: { id: operation.id, status: 'PROCESSING', leaseToken },
      data: {
        status: 'RECONCILE',
        leaseToken: null,
        leaseExpiresAt: null,
        lastError: 'STRIPE_IDEMPOTENCY_WINDOW_ELAPSED',
      },
    });
    throw new Error(`Financial operation ${operation.reference} exceeded the safe replay window`);
  }

  if (!current.externalCallStartedAt) {
    const started = await db.financialOperation.updateMany({
      where: {
        id: operation.id,
        status: 'PROCESSING',
        leaseToken,
        leaseExpiresAt: { gt: now },
        externalCallStartedAt: null,
      },
      data: { externalCallStartedAt: now },
    });
    if (started.count === 0) {
      throw new Error(`Financial operation ${operation.reference} lost its lease before provider call`);
    }
  }
}

export async function drainOrderFinancialOperations(db, stripeClient, orderId, options = {}) {
  const operations = await db.financialOperation.findMany({
    where: {
      orderId,
      status: { not: 'SUCCEEDED' },
    },
    orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  });

  for (const operation of operations) {
    await runFinancialOperation(db, stripeClient, operation.id, options);
  }
}
