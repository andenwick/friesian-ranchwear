import { enqueueTaxReversal } from '@/lib/financial-operations';
import {
  cancelPendingOrderAndRestoreStock,
  markOrderRefunded,
  projectSuccessfulPaymentAndTax,
} from '@/lib/order-lifecycle';

const EVENT_LEASE_MS = 5 * 60 * 1000;

function eventObjectId(event) {
  return event?.data?.object?.id || null;
}

async function getPendingOperationOrderId(tx, stripeEvent) {
  if (!stripeEvent.orderId) return null;
  const pending = await tx.financialOperation.count({
    where: {
      orderId: stripeEvent.orderId,
      status: { not: 'SUCCEEDED' },
    },
  });
  return pending > 0 ? stripeEvent.orderId : null;
}

export async function projectStripeEvent(db, event, options = {}) {
  if (!event?.id || !event?.type || !event?.data?.object) {
    throw new Error('Stripe event is missing required fields');
  }

  const now = options.now instanceof Date ? options.now : new Date();
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.stripeEvent.findUnique({ where: { id: event.id } });
    if (existing?.status === 'PROCESSED') {
      return {
        duplicate: true,
        orderId: await getPendingOperationOrderId(tx, existing),
      };
    }

    if (existing?.status === 'PROCESSING' && existing.leaseExpiresAt > now) {
      throw new Error(`Stripe event ${event.id} is already being processed`);
    }

    const leaseExpiresAt = new Date(now.getTime() + EVENT_LEASE_MS);
    if (existing) {
      const claimed = await tx.stripeEvent.updateMany({
        where: {
          id: event.id,
          status: { not: 'PROCESSED' },
          OR: [
            { status: { in: ['RECEIVED', 'RETRY', 'RECONCILE'] } },
            { status: 'PROCESSING', leaseExpiresAt: { lt: now } },
          ],
        },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
          leaseExpiresAt,
          lastError: null,
        },
      });
      if (claimed.count === 0) throw new Error(`Stripe event ${event.id} could not be claimed`);
    } else {
      await tx.stripeEvent.create({
        data: {
          id: event.id,
          type: event.type,
          objectId: eventObjectId(event),
          status: 'PROCESSING',
          attempts: 1,
          leaseExpiresAt,
        },
      });
    }

    await tx.$executeRawUnsafe('SAVEPOINT stripe_event_projection');
    let orderId = null;
    try {
      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object;
        orderId = await projectSuccessfulPaymentAndTax(tx, intent);
      } else if (event.type === 'payment_intent.canceled') {
        const intent = event.data.object;
        await cancelPendingOrderAndRestoreStock(tx, intent.id);
        const order = await tx.order.findUnique({
          where: { stripePaymentId: intent.id },
          select: { id: true },
        });
        if (!order) {
          throw new Error(`No order found for cancelled payment ${intent.id}`);
        }
        orderId = order?.id || null;
      } else if (event.type === 'charge.refunded') {
        const charge = event.data.object;
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
        const refundProjection = await markOrderRefunded(tx, charge);
        orderId = refundProjection.orderId;
        if (refundProjection.changed) {
          await enqueueTaxReversal(
            tx,
            { id: refundProjection.orderId },
            charge,
            refundProjection.amountApplied
          );
        }
      }
      await tx.$executeRawUnsafe('RELEASE SAVEPOINT stripe_event_projection');
    } catch (error) {
      await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT stripe_event_projection');
      await tx.$executeRawUnsafe('RELEASE SAVEPOINT stripe_event_projection');
      await tx.stripeEvent.update({
        where: { id: event.id },
        data: {
          status: 'RETRY',
          leaseExpiresAt: null,
          lastError: 'EVENT_PROJECTION_FAILED',
        },
      });
      return { retryError: String(error?.message || error) };
    }

    await tx.stripeEvent.update({
      where: { id: event.id },
      data: {
        orderId,
        status: 'PROCESSED',
        processedAt: now,
        leaseExpiresAt: null,
      },
    });

    return { duplicate: false, orderId };
  });

  if (result.retryError) throw new Error(result.retryError);
  return result;
}

export async function recordStripeEventFailure(db, event, error) {
  if (!event?.id) return;
  await db.stripeEvent.updateMany({
    where: { id: event.id, status: { not: 'PROCESSED' } },
    data: {
      status: 'RETRY',
      leaseExpiresAt: null,
      lastError: 'EVENT_PROJECTION_FAILED',
    },
  });
}
