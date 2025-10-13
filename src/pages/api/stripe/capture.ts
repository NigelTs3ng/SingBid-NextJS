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
    const { paymentIntentId, auctionId } = req.body

    if (!paymentIntentId || !auctionId) {
      return res.status(400).json({ error: 'Missing payment intent ID or auction ID' })
    }

    // Get auction details to verify it has ended
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single()

    if (auctionError || !auction) {
      return res.status(404).json({ error: 'Auction not found' })
    }

    // Verify auction has ended
    if (new Date(auction.end_time) > new Date()) {
      return res.status(400).json({ error: 'Auction has not ended yet' })
    }

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('auction_id', auctionId)
      .single()

    if (paymentError || !payment) {
      return res.status(404).json({ error: 'Payment record not found' })
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' })
    }

    // Capture the payment with Stripe
    const capturedIntent = await stripe.paymentIntents.capture(paymentIntentId)

    if (capturedIntent.status === 'succeeded') {
      // Update payment status in database
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'captured',
          captured_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) {
        console.error('Error updating payment status:', updateError)
        return res.status(500).json({ error: 'Failed to update payment status' })
      }

      // Update auction status to ended
      await supabase
        .from('auctions')
        .update({ status: 'ended' })
        .eq('id', auctionId)

      // Calculate platform fee and seller payout (95% to seller, 5% platform fee)
      const platformFee = payment.amount * 0.05
      const sellerAmount = payment.amount * 0.95

      // Create payout record for seller (to be released after 5 days)
      const releaseDate = new Date()
      releaseDate.setDate(releaseDate.getDate() + 5)

      await supabase
        .from('payouts')
        .insert({
          seller_id: auction.seller_id,
          auction_id: auctionId,
          amount: sellerAmount,
          status: 'pending',
          released_at: releaseDate.toISOString()
        })

      res.status(200).json({
        success: true,
        capturedAmount: payment.amount,
        platformFee,
        sellerAmount,
        releaseDate: releaseDate.toISOString()
      })
    } else {
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id)

      res.status(400).json({ error: 'Payment capture failed' })
    }

  } catch (error: any) {
    console.error('Capture payment error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}