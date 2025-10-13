import stripe, { STRIPE_CONFIG, PAYOUT_STATUSES } from '../../../lib/stripe.js';
import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payoutId, auctionId, reason = 'buyer_confirmation' } = req.body;

    if (!payoutId && !auctionId) {
      return res.status(400).json({ 
        error: 'Either payoutId or auctionId is required' 
      });
    }

    // Get the payout record
    let query = supabase
      .from('payouts')
      .select('*, payments(*), auctions(seller_id)')
      .eq('status', PAYOUT_STATUSES.ON_HOLD);

    if (payoutId) {
      query = query.eq('id', payoutId);
    } else {
      query = query.eq('auction_id', auctionId);
    }

    const { data: payout, error: payoutError } = await query.single();

    if (payoutError || !payout) {
      return res.status(404).json({ 
        error: 'Payout not found or not eligible for release' 
      });
    }

    // Check if hold period has expired or if manual release is requested
    const now = new Date();
    const holdExpiry = new Date(payout.hold_expires_at);
    const canRelease = now >= holdExpiry || reason === 'buyer_confirmation';

    if (!canRelease) {
      return res.status(400).json({ 
        error: 'Payout is still in hold period and no buyer confirmation provided',
        holdExpiresAt: payout.hold_expires_at 
      });
    }

    // Get seller's Stripe account
    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', payout.seller_id)
      .single();

    if (sellerError || !seller?.stripe_account_id) {
      return res.status(400).json({ 
        error: 'Seller Stripe account not found' 
      });
    }

    // Calculate transfer amount (amount after platform fee)
    const transferAmount = Math.round(payout.amount * 100); // Convert to cents

    // Create Stripe Transfer to seller's Connect account
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: STRIPE_CONFIG.currency,
      destination: seller.stripe_account_id,
      transfer_group: `auction_${auctionId}`,
      metadata: {
        auction_id: auctionId,
        payout_id: payout.id,
        release_reason: reason,
      },
    });

    // Update payout status
    const { data: updatedPayout, error: updateError } = await supabase
      .from('payouts')
      .update({
        status: PAYOUT_STATUSES.PAID,
        stripe_transfer_id: transfer.id,
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payout.id)
      .select()
      .single();

    if (updateError) {
      // Transfer was created but database update failed
      // Log this for manual review
      console.error('Database update failed after successful transfer:', updateError);
      return res.status(500).json({ 
        error: 'Transfer created but database update failed',
        transferId: transfer.id,
        details: updateError.message 
      });
    }

    // Create notification for seller
    await supabase
      .from('notifications')
      .insert({
        user_id: payout.seller_id,
        type: 'payout_released',
        title: 'Payment Released',
        message: `Your payout of $${payout.amount} for auction has been released to your account.`,
        link: `/payment-dashboard`,
      });

    return res.status(200).json({
      success: true,
      payout: updatedPayout,
      transfer: {
        id: transfer.id,
        amount: transfer.amount / 100,
        currency: transfer.currency,
        status: transfer.status,
      },
      message: `Payout of $${payout.amount} successfully released to seller.`,
    });

  } catch (error) {
    console.error('Error releasing payout:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid transfer request',
        message: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}