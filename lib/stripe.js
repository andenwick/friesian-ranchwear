import Stripe from 'stripe';

let stripeInstance = null;

export function getStripeServer() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripeInstance;
}

// Legacy export for backwards compatibility
export const stripe = {
  get paymentIntents() {
    return getStripeServer().paymentIntents;
  },
  get webhooks() {
    return getStripeServer().webhooks;
  },
};
