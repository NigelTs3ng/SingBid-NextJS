import stripe, { STRIPE_CONFIG } from '../../../lib/stripe.js';
import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { auctionId, bidAmount, paymentMethodId, bidderId } = req.body;

    if (!auctionId || !bidAmount || !paymentMethodId || !bidderId) {
      return res.status(400).json({ 
        error: 'Missing required fields: auctionId, bidAmount, paymentMethodId, bidderId' 
      });
    }

    // Get auction and seller details
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

    // Check if auction is active
    if (auction.status !== 'active') {
      return res.status(400).json({ error: 'Auction is not active' });
    }

    // Check if auction has ended
    const now = new Date();
    const endTime = new Date(auction.end_at);
    if (endTime <= now) {
      return res.status(400).json({ error: 'Auction has ended' });
    }

    // Check if bidder is trying to bid on their own auction
    if (auction.seller_id === bidderId) {
      return res.status(400).json({ error: 'Cannot bid on your own auction' });
    }

    // Check if seller has proper Stripe setup
    const sellerAccount = auction.users;
    if (!sellerAccount?.stripe_account_id || !sellerAccount?.stripe_onboarding_complete) {
      return res.status(400).json({ 
        error: 'Seller payment account not set up properly' 
      });
    }

    // Validate bid amount against current highest bid
    const { data: currentBids } = await supabase
      .from('bids')
      .select('amount')
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false })
      .limit(1);

    const currentHighestBid = currentBids?.[0]?.amount || auction.reserve || auction.starting_bid || 0;
    const bidAmountNum = parseFloat(bidAmount);

    if (bidAmountNum <= currentHighestBid) {
      return res.status(400).json({ 
        error: `Bid must be higher than current bid of ${new Intl.NumberFormat('en-SG', {
          style: 'currency',
          currency: 'SGD'
        }).format(currentHighestBid)}` 
      });
    }

    // Calculate fees for the bid amount
    const platformFee = Math.round(bidAmountNum * STRIPE_CONFIG.platformFeeRate / 100 * 100); // Convert to cents
    const amountInCents = Math.round(bidAmountNum * 100);

    // Check if bidder already has a pre-authorization for this auction
    const { data: existingPreAuth } = await supabase
      .from('bid_pre_authorizations')
      .select('*')
      .eq('auction_id', auctionId)
      .eq('bidder_id', bidderId)
      .eq('status', 'active')
      .single();

    let newPaymentIntent;

    try {
      // Create new PaymentIntent for pre-authorization
      newPaymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: STRIPE_CONFIG.currency,
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        capture_method: 'manual', // Don't capture - just authorize
        confirm: true,
        application_fee_amount: platformFee,
        transfer_data: {
          destination: sellerAccount.stripe_account_id,
        },
        metadata: {
          auction_id: auctionId,
          bidder_id: bidderId,
          bid_amount: bidAmountNum,
          type: 'bid_preauth',
        },
        description: `Bid pre-authorization for auction: ${auction.title}`,
      });

      // Handle authentication challenges
      if (newPaymentIntent.status === 'requires_action') {
        return res.status(200).json({
          success: false,
          requiresAction: true,
          paymentIntent: {
            id: newPaymentIntent.id,
            client_secret: newPaymentIntent.client_secret,
            status: newPaymentIntent.status,
          },
          message: 'Payment authentication required'
        });
      }

      if (newPaymentIntent.status !== 'requires_capture') {
        throw new Error(`Payment authorization failed: ${newPaymentIntent.status}`);
      }

    } catch (error) {
      console.error('Stripe pre-authorization failed:', error);
      return res.status(400).json({ 
        error: 'Payment pre-authorization failed',
        message: error.message,
        type: error.type || 'unknown_error'
      });
    }

    // Cancel existing pre-authorization if it exists
    if (existingPreAuth) {
      try {
        await stripe.paymentIntents.cancel(existingPreAuth.stripe_payment_intent_id);
        
        // Update existing record to canceled
        await supabase
          .from('bid_pre_authorizations')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('id', existingPreAuth.id);

      } catch (cancelError) {
        console.error('Failed to cancel existing pre-auth:', cancelError);
        // Don't fail the new bid, but log the error
      }
    }

    // Store the new pre-authorization
    const { data: preAuth, error: preAuthError } = await supabase
      .from('bid_pre_authorizations')
      .insert({
        auction_id: auctionId,
        bidder_id: bidderId,
        stripe_payment_intent_id: newPaymentIntent.id,
        stripe_payment_method_id: paymentMethodId,
        amount: bidAmountNum,
        status: 'active',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        client_secret: newPaymentIntent.client_secret,
      })
      .select()
      .single();

    if (preAuthError) {
      // Cancel the PaymentIntent if database insert fails
      await stripe.paymentIntents.cancel(newPaymentIntent.id);
      return res.status(500).json({ 
        error: 'Database error while saving pre-authorization',
        details: preAuthError.message 
      });
    }

    return res.status(200).json({
      success: true,
      preAuthorization: {
        id: preAuth.id,
        paymentIntentId: newPaymentIntent.id,
        amount: bidAmountNum,
        status: 'active',
        expiresAt: preAuth.expires_at,
      },
      message: 'Funds pre-authorized successfully. You can now place your bid.',
    });

  } catch (error) {
    console.error('Error in bid pre-authorization:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}