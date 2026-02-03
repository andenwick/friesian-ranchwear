import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';

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

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);

      // Update order status to PAID
      try {
        const order = await prisma.order.updateMany({
          where: { stripePaymentId: paymentIntent.id },
          data: { status: 'PAID' },
        });

        if (order.count === 0) {
          console.error('No order found for payment:', paymentIntent.id);
        } else {
          console.log('Order marked as PAID for payment:', paymentIntent.id);
        }
      } catch (dbError) {
        console.error('Failed to update order status:', dbError);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log('Payment failed:', paymentIntent.id);

      // Update order status to CANCELLED
      try {
        await prisma.order.updateMany({
          where: { stripePaymentId: paymentIntent.id },
          data: { status: 'CANCELLED' },
        });
        console.log('Order marked as CANCELLED for payment:', paymentIntent.id);
      } catch (dbError) {
        console.error('Failed to update order status:', dbError);
      }
      break;
    }

    default:
      console.log('Unhandled event type:', event.type);
  }

  return NextResponse.json({ received: true });
}
