import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-06-20' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { amount, currency = 'usd', auctionId } = req.body || {}
  if (!amount || !auctionId) return res.status(400).json({ error: 'Missing amount or auctionId' })

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency,
      capture_method: 'manual',
      metadata: { auctionId },
    })
    return res.status(200).json({ clientSecret: intent.client_secret, paymentIntentId: intent.id })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}


