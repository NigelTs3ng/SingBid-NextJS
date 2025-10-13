// Supabase Edge Function for Auto-Release Payments
// Deploy this to Supabase Edge Functions and set up a cron trigger

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-06-20',
    })

    const now = new Date().toISOString()
    let releasedCount = 0
    let errorCount = 0
    const errors = []

    console.log('Starting auto-release job at:', now)

    // Find all payouts that are on hold and past their expiry date
    const { data: expiredPayouts, error: payoutsError } = await supabase
      .from('payouts')
      .select(`
        id,
        seller_id,
        auction_id,
        payment_id,
        amount,
        hold_expires_at,
        payments(stripe_payment_intent_id)
      `)
      .eq('status', 'on_hold')
      .lt('hold_expires_at', now)
      .limit(50) // Process in batches

    if (payoutsError) {
      throw new Error(`Database query failed: ${payoutsError.message}`)
    }

    console.log(`Found ${expiredPayouts?.length || 0} expired payouts to process`)

    // Process each expired payout
    for (const payout of expiredPayouts || []) {
      try {
        // Get seller's Stripe account
        const { data: seller, error: sellerError } = await supabase
          .from('users')
          .select('stripe_account_id')
          .eq('id', payout.seller_id)
          .single()

        if (sellerError || !seller?.stripe_account_id) {
          throw new Error(`Seller Stripe account not found for payout ${payout.id}`)
        }

        // Calculate transfer amount
        const transferAmount = Math.round(payout.amount * 100) // Convert to cents

        // Create Stripe Transfer to seller's Connect account
        const transfer = await stripe.transfers.create({
          amount: transferAmount,
          currency: 'sgd',
          destination: seller.stripe_account_id,
          transfer_group: `auction_${payout.auction_id}`,
          metadata: {
            auction_id: payout.auction_id,
            payout_id: payout.id,
            release_reason: 'auto_release_expired',
            auto_release: 'true',
          },
        })

        // Update payout status
        const { error: updateError } = await supabase
          .from('payouts')
          .update({
            status: 'paid',
            stripe_transfer_id: transfer.id,
            released_at: now,
            updated_at: now,
          })
          .eq('id', payout.id)

        if (updateError) {
          throw new Error(`Database update failed for payout ${payout.id}: ${updateError.message}`)
        }

        // Create notification for seller
        await supabase
          .from('notifications')
          .insert({
            user_id: payout.seller_id,
            type: 'payout_auto_released',
            title: 'Payment Auto-Released',
            message: `Your payout of $${payout.amount} has been automatically released after the 5-day hold period.`,
            link: `/payment-dashboard`,
          })

        releasedCount++
        console.log(`Successfully released payout ${payout.id} - $${payout.amount}`)

      } catch (error) {
        errorCount++
        errors.push({
          payoutId: payout.id,
          error: error.message
        })
        console.error(`Error processing payout ${payout.id}:`, error)
      }
    }

    const result = {
      success: true,
      processed: expiredPayouts?.length || 0,
      released: releasedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      timestamp: now,
      message: `Auto-release job completed: ${releasedCount} payouts released, ${errorCount} errors`,
    }

    console.log('Auto-release job completed:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Auto-release job failed:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Auto-release job failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})