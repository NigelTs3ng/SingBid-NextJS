import { NextApiRequest, NextApiResponse } from 'next'
import { stripe } from '../../../utils/stripe'
import { supabase } from '../../../utils/supabaseClient'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { auctionId, bidAmount } = req.body

    if (!auctionId || !bidAmount || bidAmount <= 0) {
      return res.status(400).json({ error: 'Invalid auction ID or bid amount' })
    }

    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication' })
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

    // Validate auction status and bid amount
    if (auction.status !== 'active') {
      return res.status(400).json({ error: 'Auction is not active' })
    }

    if (new Date(auction.end_time) < new Date()) {
      return res.status(400).json({ error: 'Auction has ended' })
    }

    if (bidAmount <= auction.current_price) {
      return res.status(400).json({ error: 'Bid must be higher than current price' })
    }

    // Create PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(bidAmount * 100), // Convert to cents
      currency: 'sgd',
      customer: user.id, // Use user ID as customer reference
      metadata: {
        auction_id: auctionId,
        bidder_id: user.id,
        bid_amount: bidAmount.toString()
      },
      capture_method: 'manual', // Don't capture immediately
      description: `Bid on auction: ${auction.title}`
    })

    // Store payment intent in database
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        auction_id: auctionId,
        winner_id: user.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: bidAmount,
        status: 'pending'
      })

    if (paymentError) {
      console.error('Error storing payment intent:', paymentError)
      // Cancel the PaymentIntent if we can't store it
      await stripe.paymentIntents.cancel(paymentIntent.id)
      return res.status(500).json({ error: 'Failed to process payment' })
    }

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })

  } catch (error: any) {
    console.error('Create PaymentIntent error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}