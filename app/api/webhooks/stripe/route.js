import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';

async function cancelPendingOrderAndRestoreStock(paymentIntentId) {
  return prisma.$transaction(async (tx) => {
    // Only cancel pending orders to avoid regressing paid/shipped states.
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

    console.log('Stock restored for cancelled order:', cancelledOrder.id);
    return true;
  });
}

async function markPendingOrderPaid(paymentIntentId) {
  const updated = await prisma.order.updateMany({
    where: { stripePaymentId: paymentIntentId, status: 'PENDING' },
    data: { status: 'PAID' },
  });

  if (updated.count > 0) return true;

  const existingOrder = await prisma.order.findFirst({
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

async function markOrderRefunded(paymentIntentId) {
  if (!paymentIntentId) return false;

  const updated = await prisma.order.updateMany({
    where: {
      stripePaymentId: paymentIntentId,
      status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
    },
    data: { status: 'REFUNDED' },
  });

  return updated.count > 0;
}

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing Stripe signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const changed = await markPendingOrderPaid(paymentIntent.id);
        console.log(changed ? 'Order marked as PAID' : 'Paid order already up to date');
        break;
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object;
        const cancelled = await cancelPendingOrderAndRestoreStock(paymentIntent.id);
        console.log(cancelled ? 'Order cancelled and stock restored' : 'Cancelled order already up to date');
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        if (charge.refunded) {
          const paymentIntentId = typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
          const changed = await markOrderRefunded(paymentIntentId);
          console.log(changed ? 'Order marked as REFUNDED' : 'Refunded order already up to date');
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }
  } catch (error) {
    // A non-2xx response tells Stripe to retry instead of silently losing the event.
    console.error('Stripe webhook processing failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
