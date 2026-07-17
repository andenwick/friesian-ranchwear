import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import {
  cancelPendingOrderAndRestoreStock,
  markOrderRefunded,
  markPendingOrderPaid,
} from '@/lib/order-lifecycle';

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
        const changed = await markPendingOrderPaid(prisma, paymentIntent.id);
        console.log(changed ? 'Order marked as PAID' : 'Paid order already up to date');
        break;
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object;
        const cancelled = await cancelPendingOrderAndRestoreStock(prisma, paymentIntent.id);
        console.log(cancelled ? 'Order cancelled and stock restored' : 'Cancelled order already up to date');
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        if (charge.refunded) {
          const paymentIntentId = typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
          const changed = await markOrderRefunded(prisma, paymentIntentId);
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
