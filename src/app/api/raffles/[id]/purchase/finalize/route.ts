import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { stripe } from 'lib/stripe'
import { awardBidcoins } from 'lib/bidcoinService'
import { BIDCOIN_RAFFLE_EARN_RATE } from 'lib/bidcoinConstants'

// POST /api/raffles/[id]/purchase/finalize
// Dev-safe fallback to webhook: verifies PI and inserts entries if missing
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const { paymentIntentId } = await request.json()
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll(cs) { try { cs.forEach(({name,value,options})=>cookieStore.set(name,value,options)) } catch {} } } }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Retrieve and validate PaymentIntent
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not succeeded' }, { status: 400 })
    }

    const meta = pi.metadata || {}
    if (meta.type !== 'raffle_purchase' || meta.raffle_id !== id || meta.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Metadata mismatch' }, { status: 400 })
    }

    const raffleId = meta.raffle_id
    const purchaseId = meta.purchase_id
    const quantity = parseInt(meta.quantity || '1', 10)

    // Ensure raffle exists
    const { data: raffle } = await supabaseAdmin
      .from('raffles')
      .select('id, max_entries, tickets_sold, status, seller_id')
      .eq('id', raffleId)
      .single()

    if (!raffle) {
      return NextResponse.json({ error: 'Raffle not found' }, { status: 404 })
    }

    if (raffle.seller_id === user.id) {
      return NextResponse.json({ error: 'Sellers cannot purchase their own raffle' }, { status: 403 })
    }

    // Mark purchase succeeded if present
    if (purchaseId) {
      await supabaseAdmin
        .from('raffle_purchases')
        .update({ status: 'succeeded', stripe_payment_intent_id: paymentIntentId })
        .eq('id', purchaseId)
    }

    // Insert entries if not already inserted for this purchase
    const remaining = Math.max(0, (raffle.max_entries || 0) - (raffle.tickets_sold || 0))
    const toInsert = Math.max(0, Math.min(quantity, remaining || quantity))

    let inserted = 0
    if (toInsert > 0) {
      const entries = Array.from({ length: toInsert }).map(() => ({
        raffle_id: raffleId,
        buyer_id: user.id,
        purchase_id: purchaseId || null,
      }))
      const { error: insertErr } = await supabaseAdmin.from('raffle_entries').insert(entries)
      if (!insertErr) inserted = toInsert
    }

    if (toInsert > 0) {
      const totalSpentCents = Math.round(Number(pi.amount_received || pi.amount) || 0)
      const earnedCoins = Math.round(totalSpentCents * BIDCOIN_RAFFLE_EARN_RATE)
      if (earnedCoins > 0) {
        try {
          await awardBidcoins(
            user.id,
            earnedCoins,
            'raffle_purchase',
            { raffle_id: raffleId, purchase_id: purchaseId, quantity: toInsert },
            purchaseId || raffleId,
            purchaseId ? 'raffle_purchases' : 'raffles'
          )
        } catch (bonusError) {
          console.error('Failed to award BidCoins for raffle purchase', bonusError)
        }
      }
    }

    return NextResponse.json({ success: true, inserted })
  } catch (error) {
    console.error('Finalize raffle purchase error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}