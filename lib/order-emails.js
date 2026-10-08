import { emailIsConfigured, emailLinkBase, sendEmail } from '@/lib/email';
import { orderConfirmationEmail, orderShippedEmail } from '@/lib/email-templates';

const ORDER_EMAIL_SELECT = {
  id: true,
  userId: true,
  guestEmail: true,
  subtotal: true,
  shipping: true,
  tax: true,
  total: true,
  shippingName: true,
  shippingStreet: true,
  shippingStreet2: true,
  shippingCity: true,
  shippingState: true,
  shippingZip: true,
  user: { select: { email: true } },
  items: {
    select: { productName: true, size: true, color: true, quantity: true, unitPrice: true },
  },
};

async function sendForOrder(db, orderId, kind, build, send) {
  // Skip the order query entirely until email delivery is configured.
  if (send === sendEmail && !emailIsConfigured()) return { skipped: true };
  try {
    const order = await db.order.findUnique({ where: { id: orderId }, select: ORDER_EMAIL_SELECT });
    const to = order?.user?.email || order?.guestEmail;
    if (!order || !to) return { sent: false, code: 'NO_RECIPIENT' };

    const message = build(order, { linkBase: emailLinkBase() });
    const result = await send({ to, ...message, idempotencyKey: `${kind}-${order.id}` });
    if (result.sent) {
      console.log(JSON.stringify({ event: 'order_email_sent', kind, orderId: order.id }));
    }
    return result;
  } catch {
    // Email is a courtesy; it must never fail the payment or fulfillment write.
    console.error(JSON.stringify({ event: 'order_email_failed', kind, orderId }));
    return { sent: false, code: 'ORDER_EMAIL_FAILED' };
  }
}

export function sendOrderConfirmation(db, orderId, { send = sendEmail } = {}) {
  return sendForOrder(db, orderId, 'order-confirmation', orderConfirmationEmail, send);
}

export function sendOrderShipped(db, orderId, { send = sendEmail } = {}) {
  return sendForOrder(db, orderId, 'order-shipped', orderShippedEmail, send);
}
