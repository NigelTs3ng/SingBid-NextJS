import stripe, { STRIPE_CONFIG, PAYMENT_STEPS } from '../../../lib/stripe.js';
import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { auctionId, amount, paymentMethodId, buyerId } = req.body;

    if (!auctionId || !amount || !paymentMethodId || !buyerId) {
      return res.status(400).json({ 
        error: 'Missing required fields: auctionId, amount, paymentMethodId, buyerId' 
      });
    }

    // Get auction and seller details
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*, seller_id')
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check if seller has Stripe Connect account
    const { data: sellerAccount } = await supabase
      .from('users')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', auction.seller_id)
      .single();

    if (!sellerAccount?.stripe_account_id || !sellerAccount?.stripe_onboarding_complete) {
      return res.status(400).json({ 
        error: 'Seller payment account not set up properly' 
      });
    }

    // Calculate fees
    const platformFee = Math.round(amount * STRIPE_CONFIG.platformFeeRate / 100 * 100); // Convert to cents
    const amountInCents = Math.round(amount * 100);

    // Create PaymentIntent with manual capture for pre-authorization
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: STRIPE_CONFIG.currency,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      capture_method: 'manual', // Don't capture immediately - hold funds
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/auction-details/${auctionId}`,
      application_fee_amount: platformFee,
      transfer_data: {
        destination: sellerAccount.stripe_account_id,
      },
      metadata: {
        auction_id: auctionId,
        buyer_id: buyerId,
        seller_id: auction.seller_id,
        step: 'pre_authorization',
      },
    });

    // Store payment in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: buyerId,
        auction_id: auctionId,
        intent_id: paymentIntent.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: amount,
        currency: STRIPE_CONFIG.currency.toUpperCase(),
        status: paymentIntent.status,
        capture_method: 'manual',
        application_fee_amount: platformFee / 100,
        platform_fee: platformFee / 100,
        payment_method: 'card',
      })
      .select()
      .single();

    if (paymentError) {
      // Cancel the PaymentIntent if database insert fails
      await stripe.paymentIntents.cancel(paymentIntent.id);
      return res.status(500).json({ 
        error: 'Database error while saving payment',
        details: paymentError.message 
      });
    }

    // Update auction outcome with payment intent
    await supabase
      .from('outcomes')
      .upsert({
        auction_id: auctionId,
        winner_id: buyerId,
        final_price: amount,
        payment_intent_id: paymentIntent.id,
        payment_status: 'pending'
      });

    return res.status(200).json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status,
      },
      payment: payment,
      requiresAction: paymentIntent.status === 'requires_action',
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}