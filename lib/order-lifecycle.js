export async function reserveInventoryAndCreateOrder(db, { orderData, items }) {
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

    return tx.order.create({
      data: {
        ...orderData,
        items: { create: items },
      },
    });
  });
}

export async function restockAndCancelOrder(db, orderId) {
  return db.$transaction(async (tx) => {
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

export async function cancelPendingOrderAndRestoreStock(db, paymentIntentId) {
  return db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { stripePaymentId: paymentIntentId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
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

export async function markPendingOrderPaid(db, paymentIntentId) {
  const updated = await db.order.updateMany({
    where: { stripePaymentId: paymentIntentId, status: 'PENDING' },
    data: { status: 'PAID' },
  });

  if (updated.count > 0) return true;

  const existingOrder = await db.order.findFirst({
    where: { stripePaymentId: paymentIntentId },
    select: { status: true },
  });

  if (!existingOrder) {
    throw new Error(`No order found for successful payment ${paymentIntentId}`);
  }

  if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'].includes(existingOrder.status)) {
    return false;
  }

  throw new Error(`Successful payment ${paymentIntentId} is attached to ${existingOrder.status} order`);
}

export async function markOrderRefunded(db, paymentIntentId) {
  if (!paymentIntentId) return false;

  const updated = await db.order.updateMany({
    where: {
      stripePaymentId: paymentIntentId,
      status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
    },
    data: { status: 'REFUNDED' },
  });

  return updated.count > 0;
}
