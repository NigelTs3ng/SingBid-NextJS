import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../utils/supabaseClient'
import { stripe } from '../../../utils/stripe'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { auctionId } = req.body

    if (!auctionId) {
      return res.status(400).json({ error: 'Auction ID is required' })
    }

    // Get auction details
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single()

    if (auctionError || !auction) {
      return res.status(404).json({ error: 'Auction not found' })
    }

    // Check if auction has ended
    if (new Date(auction.end_time) > new Date()) {
      return res.status(400).json({ error: 'Auction has not ended yet' })
    }

    if (auction.status === 'ended') {
      return res.status(400).json({ error: 'Auction already finalized' })
    }

    // Get the highest bid
    const { data: highestBid, error: bidError } = await supabase
      .from('bids')
      .select(`
        *,
        users!bidder_id (email)
      `)
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false })
      .limit(1)
      .single()

    if (bidError && bidError.code !== 'PGRST116') {
      console.error('Error fetching highest bid:', bidError)
      return res.status(500).json({ error: 'Failed to get auction bids' })
    }

    // If no bids, just mark auction as ended
    if (!highestBid || highestBid.amount < auction.starting_price) {
      await supabase
        .from('auctions')
        .update({ status: 'ended' })
        .eq('id', auctionId)

      return res.status(200).json({ 
        success: true, 
        message: 'Auction ended with no qualifying bids',
        finalPrice: 0,
        winner: null
      })
    }

    // Find the payment intent for the winning bid
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('auction_id', auctionId)
      .eq('winner_id', highestBid.bidder_id)
      .eq('amount', highestBid.amount)
      .eq('status', 'pending')
      .single()

    if (paymentError || !payment) {
      console.error('No pending payment found for winning bid:', paymentError)
      
      // Mark auction as ended anyway
      await supabase
        .from('auctions')
        .update({ status: 'ended' })
        .eq('id', auctionId)

      return res.status(200).json({
        success: true,
        message: 'Auction ended but no payment to capture',
        finalPrice: highestBid.amount,
        winner: highestBid.users.email
      })
    }

    // Capture the payment with Stripe
    try {
      const capturedIntent = await stripe.paymentIntents.capture(payment.stripe_payment_intent_id)

      if (capturedIntent.status === 'succeeded') {
        // Update payment status
        await supabase
          .from('payments')
          .update({
            status: 'captured',
            captured_at: new Date().toISOString()
          })
          .eq('id', payment.id)

        // Update auction status
        await supabase
          .from('auctions')
          .update({ status: 'ended' })
          .eq('id', auctionId)

        // Calculate platform fee and seller payout
        const platformFee = payment.amount * 0.05
        const sellerAmount = payment.amount * 0.95

        // Create payout record for seller (released after 5 days)
        const releaseDate = new Date()
        releaseDate.setDate(releaseDate.getDate() + 5)

        await supabase
          .from('payouts')
          .insert({
            seller_id: auction.seller_id,
            auction_id: auctionId,
            amount: sellerAmount,
            status: 'pending'
          })

        res.status(200).json({
          success: true,
          message: 'Auction finalized and payment captured',
          finalPrice: payment.amount,
          winner: highestBid.users.email,
          platformFee,
          sellerAmount,
          payoutReleaseDate: releaseDate.toISOString()
        })
      } else {
        // Payment capture failed
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('id', payment.id)

        await supabase
          .from('auctions')
          .update({ status: 'ended' })
          .eq('id', auctionId)

        res.status(400).json({
          success: false,
          error: 'Payment capture failed',
          finalPrice: highestBid.amount,
          winner: highestBid.users.email
        })
      }
    } catch (stripeError: any) {
      console.error('Stripe capture error:', stripeError)
      
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id)

      await supabase
        .from('auctions')
        .update({ status: 'ended' })
        .eq('id', auctionId)

      res.status(500).json({
        success: false,
        error: 'Payment processing failed',
        finalPrice: highestBid.amount,
        winner: highestBid.users.email
      })
    }

  } catch (error: any) {
    console.error('Finalize auction error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}