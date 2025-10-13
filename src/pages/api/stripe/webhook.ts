import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

export const config = { api: { bodyParser: false } }

function buffer(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = []
    req.on('data', (chunk: any) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-06-20' })
  const sig = req.headers['stripe-signature'] as string
  const buf = await buffer(req)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET as string)
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      // update payments table as captured
      break
    case 'payment_intent.payment_failed':
      // mark as failed
      break
    default:
      break
  }

  res.json({ received: true })
}


