import { enqueueTaxCommit } from '@/lib/financial-operations';

export async function reserveInventoryAndCreateOrder(
  db,
  { orderData, items, checkoutAttemptId, checkoutLeaseToken }
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Order must contain at least one item');
  }

  return db.$transaction(async (tx) => {
    for (const item of items) {
      if (!item.variantId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new Error('Order item must contain a variant and positive integer quantity');
      }

      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });

      if (updated.count === 0) {
        throw new Error(`Insufficient stock for ${item.productName}`);
      }
    }

    const order = await tx.order.create({
      data: {
        ...orderData,
        items: { create: items },
      },
    });

    if (checkoutAttemptId) {
      const linked = await tx.checkoutAttempt.updateMany({
        where: {
          id: checkoutAttemptId,
          leaseToken: checkoutLeaseToken,
          status: 'TAX_READY',
          orderId: null,
        },
        data: { orderId: order.id, status: 'RESERVED' },
      });
      if (linked.count === 0) throw new Error('Checkout attempt changed before reservation');
    }

    return order;
  });
}

function inTransaction(db, operation) {
  return typeof db.$transaction === 'function' ? db.$transaction(operation) : operation(db);
}

export async function restockAndCancelOrder(db, orderId) {
  return inTransaction(db, async (tx) => {
    const cancelled = await tx.order.updateMany({
      where: { id: orderId, status: 'PENDING', paymentStatus: 'PENDING' },
      data: { status: 'CANCELLED', paymentStatus: 'CANCELLED' },
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

export async function cancelPendingOrderAndRestoreStock(db, paymentIntentId) {
  return inTransaction(db, async (tx) => {
    const updated = await tx.order.updateMany({
      where: {
        stripePaymentId: paymentIntentId,
        status: 'PENDING',
        paymentStatus: 'PENDING',
      },
      data: { status: 'CANCELLED', paymentStatus: 'CANCELLED' },
    });

    if (updated.count === 0) {
      return false;
    }

    const cancelledOrder = await tx.order.findFirst({
      where: { stripePaymentId: paymentIntentId },
      include: { items: true },
    });

    if (!cancelledOrder) {
      return true;
    }

    for (const item of cancelledOrder.items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }

    return true;
  });
}

export async function markPendingOrderPaid(db, paymentIntent) {
  const paymentIntentId = paymentIntent?.id;
  if (!paymentIntentId) throw new Error('Successful payment is missing an id');

  const existingOrder = await db.order.findUnique({
    where: { stripePaymentId: paymentIntentId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      paymentAmountCents: true,
      paymentCurrency: true,
    },
  });

  if (!existingOrder) {
    throw new Error(`No order found for successful payment ${paymentIntentId}`);
  }

  const received = paymentIntent.amount_received;
  if (received !== existingOrder.paymentAmountCents) {
    throw new Error(
      `Payment amount mismatch for ${paymentIntentId}: expected ${existingOrder.paymentAmountCents}, received ${received}`
    );
  }

  if (paymentIntent.currency?.toLowerCase() !== existingOrder.paymentCurrency) {
    throw new Error(`Payment currency mismatch for ${paymentIntentId}`);
  }

  if (['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(existingOrder.paymentStatus)) {
    return false;
  }

  if (existingOrder.paymentStatus !== 'PENDING' || existingOrder.status !== 'PENDING') {
    throw new Error(
      `Successful payment ${paymentIntentId} is attached to ${existingOrder.status}/${existingOrder.paymentStatus} order`
    );
  }

  const updated = await db.order.updateMany({
    where: { id: existingOrder.id, status: 'PENDING', paymentStatus: 'PENDING' },
    data: { status: 'PAID', paymentStatus: 'PAID' },
  });

  if (updated.count === 0) {
    throw new Error(`Order changed while projecting successful payment ${paymentIntentId}`);
  }

  return true;
}

export async function projectSuccessfulPaymentAndTax(db, paymentIntent) {
  return inTransaction(db, async (tx) => {
    await markPendingOrderPaid(tx, paymentIntent);
    const order = await tx.order.findUnique({
      where: { stripePaymentId: paymentIntent.id },
      select: { id: true, stripeTaxCalculationId: true },
    });
    if (!order) throw new Error(`No order found for successful payment ${paymentIntent.id}`);
    await enqueueTaxCommit(tx, order);
    return order.id;
  });
}

export async function markOrderRefunded(db, charge, attempt = 0) {
  const paymentIntentId = typeof charge?.payment_intent === 'string'
    ? charge.payment_intent
    : charge?.payment_intent?.id;
  if (!paymentIntentId) return false;

  const order = await db.order.findUnique({
    where: { stripePaymentId: paymentIntentId },
    select: {
      id: true,
      status: true,
      paymentAmountCents: true,
      paymentCurrency: true,
      paymentStatus: true,
      amountRefundedCents: true,
    },
  });

  if (!order) throw new Error(`No order found for refunded payment ${paymentIntentId}`);

  const amountRefunded = charge.amount_refunded;
  if (!Number.isInteger(amountRefunded) || amountRefunded < 0 || amountRefunded > order.paymentAmountCents) {
    throw new Error(`Refund amount mismatch for ${paymentIntentId}`);
  }

  if (charge.currency?.toLowerCase() !== order.paymentCurrency) {
    throw new Error(`Refund currency mismatch for ${paymentIntentId}`);
  }

  if (amountRefunded <= order.amountRefundedCents) {
    return { changed: false, orderId: order.id, amountApplied: 0 };
  }

  const fullyRefunded = amountRefunded === order.paymentAmountCents;
  const updated = await db.order.updateMany({
    where: {
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      amountRefundedCents: order.amountRefundedCents,
    },
    data: {
      amountRefundedCents: amountRefunded,
      paymentStatus: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      ...(fullyRefunded
        ? { status: 'REFUNDED' }
        : order.status === 'PENDING'
          ? { status: 'PAID' }
          : {}),
    },
  });

  if (updated.count === 0) {
    if (attempt < 2) return markOrderRefunded(db, charge, attempt + 1);
    throw new Error(`Order changed while projecting refund for ${paymentIntentId}`);
  }

  return {
    changed: true,
    orderId: order.id,
    amountApplied: amountRefunded - order.amountRefundedCents,
  };
}
