import stripe, { STRIPE_CONFIG } from '../../../lib/stripe.js';
import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { auctionId } = req.body;

    if (!auctionId) {
      return res.status(400).json({ 
        error: 'Missing required field: auctionId' 
      });
    }

    // Get auction details
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select(`
        *,
        users!seller_id(stripe_account_id, stripe_onboarding_complete)
      `)
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check if auction has actually ended
    const now = new Date();
    const endTime = new Date(auction.end_at);
    if (endTime > now) {
      return res.status(400).json({ error: 'Auction has not ended yet' });
    }

    // Check if already processed
    const { data: existingWinner } = await supabase
      .from('auction_winners')
      .select('*')
      .eq('auction_id', auctionId)
      .single();

    if (existingWinner) {
      return res.status(400).json({ 
        error: 'Auction completion already processed',
        winner: existingWinner 
      });
    }

    // Use the database function to determine winner
    const { data: winnerResult, error: winnerError } = await supabase
      .rpc('determine_auction_winner', { auction_uuid: auctionId });

    if (winnerError) {
      console.error('Failed to determine winner:', winnerError);
      return res.status(500).json({ 
        error: 'Failed to determine auction winner',
        details: winnerError.message 
      });
    }

    if (!winnerResult) {
      // No bids - auction ended without winner
      await supabase
        .from('auctions')
        .update({ status: 'completed' })
        .eq('id', auctionId);

      return res.status(200).json({
        success: true,
        winner: null,
        message: 'Auction completed with no bids'
      });
    }

    // Get the winner details
    const { data: winner, error: winnerDetailsError } = await supabase
      .from('auction_winners')
      .select(`
        *,
        bid_pre_authorizations(*)
      `)
      .eq('id', winnerResult)
      .single();

    if (winnerDetailsError || !winner) {
      return res.status(500).json({ 
        error: 'Failed to retrieve winner details' 
      });
    }

    // Check if seller has proper Stripe setup
    const sellerAccount = auction.users;
    if (!sellerAccount?.stripe_account_id || !sellerAccount?.stripe_onboarding_complete) {
      return res.status(400).json({ 
        error: 'Seller payment account not set up properly' 
      });
    }

    // Capture the payment from the winning pre-authorization
    let paymentResult;
    try {
      if (winner.bid_pre_authorizations) {
        // Capture the existing PaymentIntent
        paymentResult = await stripe.paymentIntents.capture(
          winner.bid_pre_authorizations.stripe_payment_intent_id,
          {
            amount_to_capture: Math.round(winner.winning_amount * 100), // Convert to cents
          }
        );
      } else {
        // Fallback: create new PaymentIntent if pre-auth is missing
        // This shouldn't happen in normal flow but handles edge cases
        throw new Error('No pre-authorization found for winner');
      }

      if (paymentResult.status !== 'succeeded') {
        throw new Error(`Payment capture failed: ${paymentResult.status}`);
      }

    } catch (error) {
      console.error('Payment capture failed:', error);
      
      // Update winner record with failure
      await supabase
        .from('auction_winners')
        .update({ 
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', winner.id);

      return res.status(400).json({ 
        error: 'Payment capture failed',
        message: error.message,
        winner: winner
      });
    }

    // Update winner record with successful capture
    await supabase
      .from('auction_winners')
      .update({ 
        payment_status: 'captured',
        payment_captured_at: new Date().toISOString(),
        final_payment_intent_id: paymentResult.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', winner.id);

    // Create payment record for tracking
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: winner.winner_id,
        auction_id: auctionId,
        stripe_payment_intent_id: paymentResult.id,
        amount: winner.winning_amount,
        status: 'succeeded',
        payment_step: 'captured',
        platform_fee_amount: winner.platform_fee,
        net_amount: winner.seller_amount,
        captured_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
      // Don't fail the whole process for logging issues
    }

    // Create payout record with 5-day hold
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        seller_id: auction.seller_id,
        auction_id: auctionId,
        payment_id: payment?.id,
        amount: winner.seller_amount,
        gross_amount: winner.winning_amount,
        platform_fee: winner.platform_fee,
        net_amount: winner.seller_amount,
        status: 'on_hold',
        hold_expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
        destination_account: sellerAccount.stripe_account_id,
      })
      .select()
      .single();

    if (payoutError) {
      console.error('Failed to create payout record:', payoutError);
    }

    console.log('✅ Auction completed successfully:', {
      auctionId,
      winnerId: winner.winner_id,
      winningAmount: winner.winning_amount,
      paymentIntentId: paymentResult.id,
      payoutId: payout?.id
    });

    return res.status(200).json({
      success: true,
      auction: {
        id: auctionId,
        status: 'completed',
        endedAt: auction.end_at
      },
      winner: {
        id: winner.winner_id,
        winningAmount: winner.winning_amount,
        platformFee: winner.platform_fee,
        sellerAmount: winner.seller_amount
      },
      payment: {
        id: paymentResult.id,
        status: paymentResult.status,
        capturedAt: new Date().toISOString()
      },
      payout: payout ? {
        id: payout.id,
        status: payout.status,
        holdExpiresAt: payout.hold_expires_at,
        amount: payout.net_amount
      } : null,
      message: 'Auction completed and payment captured successfully'
    });

  } catch (error) {
    console.error('Error completing auction:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}