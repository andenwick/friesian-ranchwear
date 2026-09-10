import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import {
  projectSuccessfulPaymentAndTax,
  restockAndCancelOrder,
} from '@/lib/order-lifecycle';
import { drainOrderFinancialOperations } from '@/lib/financial-operations';

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

  if (status === 'canceled') {
    return { state: 'canceled' };
  }

  if (
    status === 'requires_payment_method' ||
    status === 'requires_confirmation' ||
    status === 'requires_action'
  ) {
    return { state: 'cancellable' };
  }

  return { state: 'unknown', stripeStatus: status };
}

async function getPaymentIntentState(stripePaymentId, stripeClient = stripe) {
  if (!stripePaymentId) {
    return { state: 'missing' };
  }

  try {
    const intent = await stripeClient.paymentIntents.retrieve(stripePaymentId);
    return { ...getPaymentIntentStateFromStatus(intent.status), paymentIntent: intent };
  } catch {
    return { state: 'unknown' };
  }
}

export async function cancelPaymentIntentSafely(stripePaymentId, stripeClient = stripe) {
  try {
    const intent = await stripeClient.paymentIntents.cancel(stripePaymentId);
    return { ...getPaymentIntentStateFromStatus(intent.status), paymentIntent: intent };
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
      checkoutAttempt: { select: { status: true } },
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
    skippedCancellable: 0,
    skippedCheckout: 0,
    skippedUnknown: 0,
  };

  for (const order of stalePendingOrders) {
    if (
      !order.stripePaymentId &&
      order.checkoutAttempt &&
      order.checkoutAttempt.status !== 'FAILED'
    ) {
      summary.skippedCheckout += 1;
      continue;
    }
    let paymentState = await getPaymentIntentState(order.stripePaymentId, stripeClient);

    if (paymentState.state === 'paid') {
      const orderId = await projectSuccessfulPaymentAndTax(
        db,
        paymentState.paymentIntent
      );
      await drainOrderFinancialOperations(db, stripeClient, orderId);
      summary.markedPaid += 1;
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

    if (paymentState.state === 'cancellable') {
      const finalPaymentState = await cancelPaymentIntentSafely(order.stripePaymentId, stripeClient);
      paymentState = finalPaymentState;

      if (finalPaymentState.state === 'paid') {
        const orderId = await projectSuccessfulPaymentAndTax(
          db,
          finalPaymentState.paymentIntent
        );
        await drainOrderFinancialOperations(db, stripeClient, orderId);
        summary.markedPaid += 1;
        continue;
      }

      if (finalPaymentState.state === 'in_progress') {
        summary.skippedInProgress += 1;
        continue;
      }

      if (finalPaymentState.state === 'cancellable') {
        // Stripe did not confirm cancellation. The intent can still be paid, so
        // releasing stock here could create an oversold, successfully-paid order.
        summary.skippedCancellable += 1;
        continue;
      }

      if (finalPaymentState.state === 'unknown') {
        summary.skippedUnknown += 1;
        continue;
      }
    }


    if (paymentState.state !== 'canceled' && paymentState.state !== 'missing') {
      summary.skippedUnknown += 1;
      continue;
    }

    const cancelled = await restockAndCancelOrder(db, order.id);
    if (cancelled) {
      summary.cancelled += 1;
    }
  }

  return summary;
}

