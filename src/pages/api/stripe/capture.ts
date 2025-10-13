import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-06-20' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { paymentIntentId } = req.body || {}
  if (!paymentIntentId) return res.status(400).json({ error: 'Missing paymentIntentId' })

  try {
    const captured = await stripe.paymentIntents.capture(paymentIntentId)
    return res.status(200).json({ status: captured.status })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}


