import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { drainOrderFinancialOperations } from '@/lib/financial-operations';
import { projectStripeEvent, recordStripeEventFailure } from '@/lib/stripe-event-ledger';
import { operationalErrorCode } from '@/lib/operational-errors';

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error(JSON.stringify({ event: 'stripe_webhook_rejected', code: 'MISSING_SIGNATURE' }));
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    console.error(JSON.stringify({ event: 'stripe_webhook_rejected', code: 'INVALID_SIGNATURE' }));
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const projection = await projectStripeEvent(prisma, event);
    if (projection.orderId) {
      await drainOrderFinancialOperations(prisma, stripe, projection.orderId);
    }
    console.log(JSON.stringify({
      event: 'stripe_webhook_processed',
      stripeEventId: event.id,
      stripeEventType: event.type,
      orderId: projection.orderId,
      duplicate: projection.duplicate,
    }));
  } catch (error) {
    // A non-2xx response tells Stripe to retry instead of silently losing the event.
    try {
      await recordStripeEventFailure(prisma, event, error);
    } catch (recordError) {
      console.error(JSON.stringify({
        event: 'stripe_webhook_ledger_write_failed',
        code: operationalErrorCode(recordError, 'LEDGER_WRITE_FAILED'),
        stripeEventId: event.id,
      }));
    }
    console.error(JSON.stringify({
      event: 'stripe_webhook_processing_failed',
      stripeEventId: event.id,
      stripeEventType: event.type,
      code: operationalErrorCode(error, 'WEBHOOK_PROCESSING_FAILED'),
    }));
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
