import { NextApiRequest, NextApiResponse } from 'next'
import { stripe } from '../../../utils/stripe'
import { supabase } from '../../../utils/supabaseClient'
import { buffer } from 'micro'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' })
  }

  let event

  try {
    const body = await buffer(req)
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  const { auction_id, bidder_id } = paymentIntent.metadata

  if (!auction_id || !bidder_id) {
    console.error('Missing metadata in payment intent:', paymentIntent.id)
    return
  }

  // Update payment status
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'captured',
      captured_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (paymentError) {
    console.error('Error updating payment status:', paymentError)
  }

  console.log(`Payment succeeded for auction ${auction_id}`)
}

async function handlePaymentFailed(paymentIntent: any) {
  // Update payment status to failed
  const { error } = await supabase
    .from('payments')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (error) {
    console.error('Error updating failed payment status:', error)
  }

  console.log(`Payment failed for payment intent ${paymentIntent.id}`)
}

async function handlePaymentCanceled(paymentIntent: any) {
  // Remove the payment record since it was canceled
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (error) {
    console.error('Error removing canceled payment:', error)
  }

  console.log(`Payment canceled for payment intent ${paymentIntent.id}`)
}