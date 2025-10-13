import { supabase } from '../../../lib/supabase.js';
import stripe from '../../../lib/stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { auctionId, bidAmount, preAuthId, bidderId } = req.body;

    if (!auctionId || !bidAmount || !preAuthId || !bidderId) {
      return res.status(400).json({ 
        error: 'Missing required fields: auctionId, bidAmount, preAuthId, bidderId' 
      });
    }

    // Validate pre-authorization exists and is active
    const { data: preAuth, error: preAuthError } = await supabase
      .from('bid_pre_authorizations')
      .select('*')
      .eq('id', preAuthId)
      .eq('auction_id', auctionId)
      .eq('bidder_id', bidderId)
      .eq('status', 'active')
      .single();

    if (preAuthError || !preAuth) {
      return res.status(400).json({ 
        error: 'Invalid or expired pre-authorization. Please refresh and try again.' 
      });
    }

    // Check if pre-auth amount matches bid amount
    const bidAmountNum = parseFloat(bidAmount);
    if (Math.abs(preAuth.amount - bidAmountNum) > 0.01) { // Allow for small floating point differences
      return res.status(400).json({ 
        error: 'Bid amount does not match pre-authorized amount' 
      });
    }

    // Check if pre-auth has expired
    const now = new Date();
    const expiryTime = new Date(preAuth.expires_at);
    if (expiryTime <= now) {
      // Mark as expired
      await supabase
        .from('bid_pre_authorizations')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', preAuthId);

      return res.status(400).json({ 
        error: 'Pre-authorization has expired. Please create a new bid.' 
      });
    }

    // Get auction details for final validation
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id, seller_id, status, end_at, reserve, starting_bid')
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Final validations
    if (auction.status !== 'active') {
      return res.status(400).json({ error: 'Auction is not active' });
    }

    const endTime = new Date(auction.end_at);
    if (endTime <= now) {
      return res.status(400).json({ error: 'Auction has ended' });
    }

    if (auction.seller_id === bidderId) {
      return res.status(400).json({ error: 'Cannot bid on your own auction' });
    }

    // Validate bid amount against current highest bid (final check)
    const { data: currentBids } = await supabase
      .from('bids')
      .select('amount')
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false })
      .limit(1);

    const currentHighestBid = currentBids?.[0]?.amount || auction.reserve || auction.starting_bid || 0;

    if (bidAmountNum <= currentHighestBid) {
      return res.status(400).json({ 
        error: `Bid must be higher than current bid of ${new Intl.NumberFormat('en-SG', {
          style: 'currency',
          currency: 'SGD'
        }).format(currentHighestBid)}` 
      });
    }

    // Use Supabase service role for database operations
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Create the bid record
    const { data: placedBid, error: bidError } = await supabase
      .from('bids')
      .insert({
        auction_id: auctionId,
        bidder_id: bidderId,
        amount: bidAmountNum,
        is_auto_bid: false,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (bidError) {
      console.error('Failed to create bid:', bidError);
      return res.status(500).json({ 
        error: 'Failed to place bid',
        details: bidError.message 
      });
    }

    // The outbid cleanup trigger will automatically handle:
    // 1. Finding previous highest bidder
    // 2. Canceling their pre-auth
    // 3. Creating cleanup records
    // This happens automatically via the database trigger

    console.log('✅ Bid placed successfully:', {
      bidId: placedBid.id,
      auctionId,
      bidderId,
      amount: bidAmountNum,
      preAuthId
    });

    return res.status(200).json({
      success: true,
      bid: {
        id: placedBid.id,
        auctionId: placedBid.auction_id,
        bidderId: placedBid.bidder_id,
        amount: placedBid.amount,
        timestamp: placedBid.created_at,
      },
      preAuthorization: {
        id: preAuth.id,
        status: 'active', // Still active until auction ends
        amount: preAuth.amount,
      },
      message: 'Bid placed successfully!'
    });

  } catch (error) {
    console.error('Error placing bid:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}