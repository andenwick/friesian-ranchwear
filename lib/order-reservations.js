import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';

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

async function getPaymentIntentState(stripePaymentId) {
  if (!stripePaymentId) {
    return { state: 'abandoned' };
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(stripePaymentId);

    if (intent.status === 'succeeded') {
      return { state: 'paid' };
    }

    if (intent.status === 'processing' || intent.status === 'requires_capture') {
      return { state: 'in_progress' };
    }

    if (
      intent.status === 'canceled' ||
      intent.status === 'requires_payment_method' ||
      intent.status === 'requires_confirmation' ||
      intent.status === 'requires_action'
    ) {
      return { state: 'abandoned' };
    }

    return { state: 'unknown', stripeStatus: intent.status };
  } catch (error) {
    return { state: 'unknown', error: error?.message };
  }
}

async function restockAndCancelOrder(orderId) {
  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.order.updateMany({
      where: { id: orderId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    if (cancelled.count === 0) {
      return false;
    }

    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { variantId: true, quantity: true },
    });

    for (const item of items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }

    return true;
  });
}

export async function cleanupExpiredPendingOrders(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const ttlMinutes = getPendingTtlMinutes();
  const cutoff = new Date(now.getTime() - ttlMinutes * 60 * 1000);
  const limit = Math.max(1, Math.min(options.limit || 25, MAX_CLEANUP_BATCH));

  const stalePendingOrders = await prisma.order.findMany({
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
    const paymentState = await getPaymentIntentState(order.stripePaymentId);

    if (paymentState.state === 'paid') {
      const updated = await prisma.order.updateMany({
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
      try {
        await stripe.paymentIntents.cancel(order.stripePaymentId);
      } catch {}
    }

    const cancelled = await restockAndCancelOrder(order.id);
    if (cancelled) {
      summary.cancelled += 1;
    }
  }

  return summary;
}

