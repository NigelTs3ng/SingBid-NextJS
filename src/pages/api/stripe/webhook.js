import stripe, { STRIPE_CONFIG, PAYOUT_STATUSES } from '../../../lib/stripe.js';
import { supabase } from '../../../lib/supabase.js';

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to get raw body
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('Received Stripe webhook:', event.type);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object);
        break;

      case 'transfer.failed':
        await handleTransferFailed(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({ error: error.message });
  }
}

// Handle successful payment intent
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    // Update auction outcome
    if (paymentIntent.metadata.auction_id) {
      await supabase
        .from('outcomes')
        .update({
          payment_status: 'paid',
          captured_at: new Date().toISOString(),
        })
        .eq('auction_id', paymentIntent.metadata.auction_id);
    }

    console.log('Payment intent succeeded:', paymentIntent.id);
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

// Handle failed payment intent
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: paymentIntent.last_payment_error?.message || 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    // Update auction outcome
    if (paymentIntent.metadata.auction_id) {
      await supabase
        .from('outcomes')
        .update({
          payment_status: 'failed',
        })
        .eq('auction_id', paymentIntent.metadata.auction_id);
    }

    console.log('Payment intent failed:', paymentIntent.id);
  } catch (error) {
    console.error('Error handling payment_intent.failed:', error);
  }
}

// Handle account updates (for onboarding completion)
async function handleAccountUpdated(account) {
  try {
    const isOnboardingComplete = account.details_submitted && 
                                account.charges_enabled && 
                                account.payouts_enabled;

    await supabase
      .from('users')
      .update({
        stripe_onboarding_complete: isOnboardingComplete,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', account.id);

    // Create notification if onboarding is complete
    if (isOnboardingComplete) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_account_id', account.id)
        .single();

      if (user) {
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'onboarding_complete',
            title: 'Payment Setup Complete',
            message: 'Your seller account is now ready to receive payments!',
            link: '/create-auction',
          });
      }
    }

    console.log('Account updated:', account.id, 'Complete:', isOnboardingComplete);
  } catch (error) {
    console.error('Error handling account.updated:', error);
  }
}

// Handle transfer creation
async function handleTransferCreated(transfer) {
  try {
    if (transfer.metadata.payout_id) {
      await supabase
        .from('payouts')
        .update({
          stripe_transfer_id: transfer.id,
          status: PAYOUT_STATUSES.PROCESSING,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transfer.metadata.payout_id);
    }

    console.log('Transfer created:', transfer.id);
  } catch (error) {
    console.error('Error handling transfer.created:', error);
  }
}

// Handle failed transfers
async function handleTransferFailed(transfer) {
  try {
    if (transfer.metadata.payout_id) {
      await supabase
        .from('payouts')
        .update({
          status: PAYOUT_STATUSES.FAILED,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transfer.metadata.payout_id);

      // Notify seller of failed transfer
      const { data: payout } = await supabase
        .from('payouts')
        .select('seller_id')
        .eq('id', transfer.metadata.payout_id)
        .single();

      if (payout) {
        await supabase
          .from('notifications')
          .insert({
            user_id: payout.seller_id,
            type: 'payout_failed',
            title: 'Payout Failed',
            message: 'Your payout could not be processed. Please contact support.',
            link: '/payment-dashboard',
          });
      }
    }

    console.log('Transfer failed:', transfer.id);
  } catch (error) {
    console.error('Error handling transfer.failed:', error);
  }
}

// Handle subscription payments
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    if (invoice.subscription) {
      // Update subscription status
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      
      await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
    }

    console.log('Invoice payment succeeded:', invoice.id);
  } catch (error) {
    console.error('Error handling invoice.payment_succeeded:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription) {
  try {
    await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    console.log('Subscription updated:', subscription.id);
  } catch (error) {
    console.error('Error handling customer.subscription.updated:', error);
  }
}