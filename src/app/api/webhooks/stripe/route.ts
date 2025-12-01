import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import PaymentService from 'lib/paymentService'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { awardBidcoins } from 'lib/bidcoinService'
import { BIDCOIN_RAFFLE_EARN_RATE } from 'lib/bidcoinConstants'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)



const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Handle raffle purchases
        if (paymentIntent.metadata?.type === 'raffle_purchase') {
          try {
            const supabaseAdmin = createSupabaseClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
              { auth: { autoRefreshToken: false, persistSession: false } }
            )

            // Update purchase status
            const purchaseId = paymentIntent.metadata.purchase_id
            const raffleId = paymentIntent.metadata.raffle_id
            const buyerId = paymentIntent.metadata.buyer_id
            const quantity = parseInt(paymentIntent.metadata.quantity || '1', 10)

            if (purchaseId) {
              await supabaseAdmin
                .from('raffle_purchases')
                .update({ status: 'succeeded' })
                .eq('id', purchaseId)
            }

            // Fetch raffle to compute remaining
            const { data: raffle } = await supabaseAdmin
              .from('raffles')
              .select('id, max_entries, tickets_sold, status')
              .eq('id', raffleId)
              .single()

            const remaining = Math.max(0, (raffle?.max_entries || 0) - (raffle?.tickets_sold || 0))
            const toInsert = Math.max(0, Math.min(quantity, remaining || quantity))

            if (toInsert > 0) {
              const entries = Array.from({ length: toInsert }).map(() => ({
                raffle_id: raffleId,
                buyer_id: buyerId,
                purchase_id: purchaseId,
              }))
              await supabaseAdmin.from('raffle_entries').insert(entries)
            }

            const totalSpentCents = Math.round(Number(paymentIntent.amount_received || paymentIntent.amount) || 0)
            const earnedCoins = Math.round(totalSpentCents * BIDCOIN_RAFFLE_EARN_RATE)
            if (earnedCoins > 0 && buyerId) {
              try {
                await awardBidcoins(
                  buyerId,
                  earnedCoins,
                  'raffle_purchase',
                  { raffle_id: raffleId, purchase_id: purchaseId, quantity },
                  purchaseId || raffleId,
                  purchaseId ? 'raffle_purchases' : 'raffles'
                )
              } catch (bonusError) {
                console.error('Webhook BidCoin award error:', bonusError)
              }
            }

            console.log(`Raffle purchase succeeded: ${paymentIntent.id} -> ${toInsert} entries`)
          } catch (e) {
            console.error('Error finalizing raffle purchase:', e)
          }
        } else {
          // Default auction payment flow
          await PaymentService.confirmPayment(paymentIntent.id)
          console.log(`Payment succeeded: ${paymentIntent.id}`)
        }
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