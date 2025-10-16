import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import PaymentService from '@/lib/paymentService'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await PaymentService.confirmPayment(paymentIntent.id)
        console.log(`Payment succeeded: ${paymentIntent.id}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await PaymentService.handleFailedPayment(
          paymentIntent.id,
          paymentIntent.last_payment_error?.message || 'Unknown error'
        )
        console.log(`Payment failed: ${paymentIntent.id}`)
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        
        // Check if charges are enabled (account is fully onboarded)
        const chargesEnabled = account.charges_enabled
        const detailsSubmitted = account.details_submitted
        
        let status: 'pending' | 'active' | 'rejected' = 'pending'
        
        if (chargesEnabled && detailsSubmitted) {
          status = 'active'
        } else if (account.requirements?.currently_due?.length === 0) {
          status = 'active'
        } else if (account.requirements?.disabled_reason) {
          status = 'rejected'
        }

        await PaymentService.updateSellerAccountStatus(
          account.id,
          status,
          chargesEnabled && detailsSubmitted
        )
        
        console.log(`Account updated: ${account.id}, status: ${status}`)
        break
      }

      case 'account.application.deauthorized': {
        const application = event.data.object
        // Handle when a seller disconnects their account
        console.log(`Account deauthorized: ${application}`)
        break
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        // Update payment record with transfer ID if needed
        console.log(`Transfer created: ${transfer.id}`)
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        // Handle dispute creation - could pause seller payouts
        console.log(`Dispute created: ${dispute.id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}