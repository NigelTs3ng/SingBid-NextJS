import stripe, { STRIPE_CONFIG, PAYMENT_STEPS, PAYOUT_STATUSES } from '../../../lib/stripe.js';
import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { auctionId, paymentIntentId } = req.body;

    if (!auctionId || !paymentIntentId) {
      return res.status(400).json({ 
        error: 'Missing required fields: auctionId, paymentIntentId' 
      });
    }

    // Get the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('auction_id', auctionId)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('status', 'requires_capture')
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ 
        error: 'Pre-authorized payment not found or not ready for capture' 
      });
    }

    // Capture the PaymentIntent
    const capturedPayment = await stripe.paymentIntents.capture(
      paymentIntentId,
      {
        amount_to_capture: Math.round(payment.amount * 100), // Convert to cents
      }
    );

    // Update payment status in database
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ 
        error: 'Database update error',
        details: updateError.message 
      });
    }

    // Update auction outcome
    await supabase
      .from('outcomes')
      .update({
        payment_status: 'paid',
        captured_at: new Date().toISOString(),
      })
      .eq('auction_id', auctionId);

    // Create payout record with 5-day hold
    const netAmount = payment.amount - payment.platform_fee;
    const holdExpiresAt = new Date();
    holdExpiresAt.setDate(holdExpiresAt.getDate() + STRIPE_CONFIG.escrowHoldDays);

    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        seller_id: payment.user_id, // This should be seller_id from auction
        auction_id: auctionId,
        payment_id: payment.id,
        amount: netAmount,
        status: PAYOUT_STATUSES.ON_HOLD,
        hold_expires_at: holdExpiresAt.toISOString(),
        hold_reason: 'buyer_protection',
      })
      .select()
      .single();

    if (payoutError) {
      console.error('Error creating payout record:', payoutError);
      // Don't fail the request as payment capture was successful
    }

    return res.status(200).json({
      success: true,
      payment: updatedPayment,
      capturedPayment: {
        id: capturedPayment.id,
        status: capturedPayment.status,
        amount: capturedPayment.amount,
      },
      payout: payout,
      message: 'Payment captured successfully. Funds will be held for 5 days for buyer protection.',
    });

  } catch (error) {
    console.error('Error capturing payment:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ 
        error: 'Payment capture failed',
        message: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}