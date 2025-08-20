import Stripe from 'stripe';

// Initialize Stripe only if the secret key is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
    })
  : null;

export const getStripe = () => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
  }
  
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  
  return stripe;
};