import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-06-20' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    // find ended auctions without captured payments
    const { data: endedAuctions, error } = await supabase
      .from('auctions')
      .select('id')
      .eq('status', 'ended')

    if (error) throw error

    // For each auction, find highest bid and capture corresponding payment intent
    for (const a of endedAuctions || []) {
      const { data: topBid } = await supabase
        .from('bids')
        .select('bidder_id, amount')
        .eq('auction_id', a.id)
        .order('amount', { ascending: false })
        .limit(1)
        .single()

      if (!topBid) continue

      const { data: payment } = await supabase
        .from('payments')
        .select('id, stripe_payment_intent_id, status')
        .eq('auction_id', a.id)
        .limit(1)
        .single()

      if (payment && payment.status !== 'captured' && payment.stripe_payment_intent_id) {
        await stripe.paymentIntents.capture(payment.stripe_payment_intent_id)
        await supabase
          .from('payments')
          .update({ status: 'captured', captured_at: new Date().toISOString() })
          .eq('id', payment.id)
      }
    }

    return res.status(200).json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}


