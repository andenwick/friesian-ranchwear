import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { restockAndCancelOrder } from '@/lib/order-lifecycle';

const DEFAULT_PENDING_TTL_MINUTES = 30;
const MAX_CLEANUP_BATCH = 100;

function getPendingTtlMinutes() {
  const raw = process.env.CHECKOUT_PENDING_TTL_MINUTES;
  const parsed = Number.parseInt(raw || '', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_PENDING_TTL_MINUTES;
}

export function getPaymentIntentStateFromStatus(status) {
  if (status === 'succeeded') {
    return { state: 'paid' };
  }

  if (status === 'processing' || status === 'requires_capture') {
    return { state: 'in_progress' };
  }

  if (
    status === 'canceled' ||
    status === 'requires_payment_method' ||
    status === 'requires_confirmation' ||
    status === 'requires_action'
  ) {
    return { state: 'abandoned' };
  }

  return { state: 'unknown', stripeStatus: status };
}

async function getPaymentIntentState(stripePaymentId, stripeClient = stripe) {
  if (!stripePaymentId) {
    return { state: 'abandoned' };
  }

  try {
    const intent = await stripeClient.paymentIntents.retrieve(stripePaymentId);
    return getPaymentIntentStateFromStatus(intent.status);
  } catch (error) {
    return { state: 'unknown', error: error?.message };
  }
}

export async function cancelPaymentIntentSafely(stripePaymentId, stripeClient = stripe) {
  try {
    const intent = await stripeClient.paymentIntents.cancel(stripePaymentId);
    return getPaymentIntentStateFromStatus(intent.status);
  } catch {
    // The payment may have completed between the earlier retrieve and cancel.
    // Re-read it before releasing inventory.
    return getPaymentIntentState(stripePaymentId, stripeClient);
  }
}

export async function cleanupExpiredPendingOrders(options = {}) {
  const db = options.prismaClient || prisma;
  const stripeClient = options.stripeClient || stripe;
  const now = options.now instanceof Date ? options.now : new Date();
  const ttlMinutes = getPendingTtlMinutes();
  const cutoff = new Date(now.getTime() - ttlMinutes * 60 * 1000);
  const limit = Math.max(1, Math.min(options.limit || 25, MAX_CLEANUP_BATCH));

  const stalePendingOrders = await db.order.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: cutoff },
    },
    select: {
      id: true,
      stripePaymentId: true,
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const summary = {
    cutoff,
    checked: stalePendingOrders.length,
    cancelled: 0,
    markedPaid: 0,
    skippedInProgress: 0,
    skippedUnknown: 0,
  };

  for (const order of stalePendingOrders) {
    const paymentState = await getPaymentIntentState(order.stripePaymentId, stripeClient);

    if (paymentState.state === 'paid') {
      const updated = await db.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'PAID' },
      });
      if (updated.count > 0) {
        summary.markedPaid += 1;
      }
      continue;
    }

    if (paymentState.state === 'in_progress') {
      summary.skippedInProgress += 1;
      continue;
    }

    if (paymentState.state === 'unknown') {
      summary.skippedUnknown += 1;
      continue;
    }

    if (order.stripePaymentId) {
      const finalPaymentState = await cancelPaymentIntentSafely(order.stripePaymentId, stripeClient);

      if (finalPaymentState.state === 'paid') {
        const updated = await db.order.updateMany({
          where: { id: order.id, status: 'PENDING' },
          data: { status: 'PAID' },
        });
        if (updated.count > 0) {
          summary.markedPaid += 1;
        }
        continue;
      }

      if (finalPaymentState.state === 'in_progress') {
        summary.skippedInProgress += 1;
        continue;
      }

      if (finalPaymentState.state === 'unknown') {
        summary.skippedUnknown += 1;
        continue;
      }
    }

    const cancelled = await restockAndCancelOrder(db, order.id);
    if (cancelled) {
      summary.cancelled += 1;
    }
  }

  return summary;
}

