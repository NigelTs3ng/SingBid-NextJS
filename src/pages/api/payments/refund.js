import stripe, { STRIPE_CONFIG, PAYOUT_STATUSES } from '../../../lib/stripe.js';
import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentIntentId, auctionId, reason, amount } = req.body;

    if (!paymentIntentId || !auctionId) {
      return res.status(400).json({ 
        error: 'Missing required fields: paymentIntentId, auctionId' 
      });
    }

    // Get the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('auction_id', auctionId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ 
        error: 'Payment not found' 
      });
    }

    // Check if payment was captured (can't refund uncaptured payments)
    if (payment.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Payment must be captured before it can be refunded' 
      });
    }

    // Calculate refund amount (default to full amount if not specified)
    const refundAmount = amount ? Math.round(amount * 100) : Math.round(payment.amount * 100);

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      reason: reason || 'requested_by_customer',
      metadata: {
        auction_id: auctionId,
        original_amount: payment.amount,
      },
    });

    // Update payment status
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: refundAmount >= Math.round(payment.amount * 100) ? 'refunded' : 'partially_refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update failed after refund:', updateError);
    }

    // Update auction outcome
    await supabase
      .from('outcomes')
      .update({
        payment_status: refundAmount >= Math.round(payment.amount * 100) ? 'refunded' : 'partially_refunded',
      })
      .eq('auction_id', auctionId);

    // Cancel any pending payouts for this auction
    const { data: canceledPayouts } = await supabase
      .from('payouts')
      .update({
        status: PAYOUT_STATUSES.CANCELED,
        updated_at: new Date().toISOString(),
      })
      .eq('auction_id', auctionId)
      .eq('status', PAYOUT_STATUSES.ON_HOLD)
      .select();

    // Create notifications
    const refundAmountDollars = refundAmount / 100;
    
    // Notify buyer of refund
    await supabase
      .from('notifications')
      .insert({
        user_id: payment.user_id,
        type: 'refund_processed',
        title: 'Refund Processed',
        message: `Your refund of $${refundAmountDollars} has been processed and will appear in your account within 5-10 business days.`,
        link: `/payment-dashboard`,
      });

    // Notify seller if payout was canceled
    if (canceledPayouts && canceledPayouts.length > 0) {
      const sellerId = canceledPayouts[0].seller_id;
      await supabase
        .from('notifications')
        .insert({
          user_id: sellerId,
          type: 'payout_canceled',
          title: 'Payout Canceled',
          message: `Your payout has been canceled due to a refund request. Please contact support if you have questions.`,
          link: `/payment-dashboard`,
        });
    }

    return res.status(200).json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
      },
      payment: updatedPayment,
      canceledPayouts: canceledPayouts?.length || 0,
      message: `Refund of $${refundAmountDollars} processed successfully.`,
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid refund request',
        message: error.message 
      });
    }

    if (error.code === 'charge_already_refunded') {
      return res.status(400).json({ 
        error: 'Payment has already been refunded' 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}