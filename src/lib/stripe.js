// Stripe Configuration for SingBid 6-Step Payment Flow
import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Stripe Connect configuration
export const STRIPE_CONFIG = {
  // Platform settings
  platformFeeRate: 5.00, // 5% platform fee
  currency: 'sgd',
  country: 'SG',
  
  // Payment settings
  escrowHoldDays: 5,
  autoReleaseEnabled: true,
  
  // Connect account settings
  connectAccountType: 'express', // express, custom, or standard
  
  // Webhook endpoints
  webhookEndpoints: {
    account: '/api/stripe/webhook',
    payment: '/api/stripe/webhook',
    payout: '/api/stripe/webhook',
    dispute: '/api/stripe/webhook',
  },
  
  // Required capabilities for sellers
  requiredCapabilities: [
    'card_payments',
    'transfers',
  ],
};

// Payment flow steps
export const PAYMENT_STEPS = {
  PRE_AUTHORIZED: 'pre_authorized',
  CAPTURED: 'captured', 
  IN_ESCROW: 'in_escrow',
  RELEASED: 'released',
  DISPUTED: 'disputed',
  COMPLETED: 'completed',
};

// Payment statuses (Stripe PaymentIntent statuses)
export const PAYMENT_STATUSES = {
  REQUIRES_CONFIRMATION: 'requires_confirmation',
  REQUIRES_ACTION: 'requires_action',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  CANCELED: 'canceled',
  REQUIRES_CAPTURE: 'requires_capture',
};

// Payout statuses
export const PAYOUT_STATUSES = {
  ON_HOLD: 'on_hold',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELED: 'canceled'
};

export default stripe;