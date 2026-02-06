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
          where: { stripePaymentId: paymentIntent.id, status: 'PENDING' },
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

      try {
        // Use transaction to atomically cancel and restore stock
        await prisma.$transaction(async (tx) => {
          // Only cancel if not already cancelled (prevents double stock restore)
          const updated = await tx.order.updateMany({
            where: { stripePaymentId: paymentIntent.id, status: { not: 'CANCELLED' } },
            data: { status: 'CANCELLED' },
          });

          // Only restore stock if we actually changed the status
          if (updated.count > 0) {
            const cancelledOrder = await tx.order.findFirst({
              where: { stripePaymentId: paymentIntent.id },
              include: { items: true },
            });

            if (cancelledOrder) {
              for (const item of cancelledOrder.items) {
                await tx.productVariant.update({
                  where: { id: item.variantId },
                  data: { stock: { increment: item.quantity } },
                });
              }
              console.log('Stock restored for cancelled order:', cancelledOrder.id);
            }
          }
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
