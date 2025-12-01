import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { stripe, StripeService } from 'lib/stripe'
import { getBidcoinBalance, spendBidcoins, awardBidcoins } from 'lib/bidcoinService'
import { BIDCOIN_RAFFLE_EARN_RATE } from 'lib/bidcoinConstants'

// POST /api/raffles/[id]/purchase - create PaymentIntent for raffle tickets
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const { quantity = 1, useBidcoins = false } = await request.json()
    const requestedQty = Math.max(1, Number(quantity))

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

    // Prevent duplicate purchases: block if user already has entries
    const { count: existingEntries } = await supabaseAdmin
      .from('raffle_entries')
      .select('*', { count: 'exact', head: true })
      .eq('raffle_id', id)
      .eq('buyer_id', user.id)

    if ((existingEntries || 0) > 0) {
      return NextResponse.json({ error: 'You already have entries for this raffle' }, { status: 409 })
    }

    // Load raffle
    const { data: raffle, error: raffleError } = await supabaseAdmin
      .from('raffles')
      .select('*')
      .eq('id', id)
      .single()

    if (raffleError || !raffle) {
      return NextResponse.json({ error: 'Raffle not found' }, { status: 404 })
    }

    // Prevent sellers from purchasing their own raffle
    if (raffle.seller_id === user.id) {
      return NextResponse.json({ error: 'Sellers cannot purchase entries for their own raffle' }, { status: 403 })
    }

    if (raffle.status !== 'active' || new Date(raffle.end_time) <= new Date()) {
      return NextResponse.json({ error: 'Raffle is not active' }, { status: 400 })
    }

    const remaining = Math.max(0, raffle.max_entries - (raffle.tickets_sold || 0))
    if (remaining <= 0) {
      return NextResponse.json({ error: 'Raffle is full' }, { status: 400 })
    }

    // Cap the requested quantity to what is actually remaining at this moment.
    // This reduces the chance of overselling when multiple buyers purchase concurrently.
    const qty = Math.max(0, Math.min(requestedQty, remaining))
    if (qty <= 0) {
      return NextResponse.json({ error: 'Raffle is full' }, { status: 400 })
    }

    // Ensure Stripe customer
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('email, name, stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await StripeService.createCustomer(profile!.email, profile!.name)
      customerId = customer.id
      await supabaseAdmin.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const amount = raffle.ticket_price * qty
    const amountInCoins = Math.round(amount)

    if (useBidcoins) {
      const balance = await getBidcoinBalance(user.id)
      if (balance < amountInCoins) {
        return NextResponse.json({ error: 'Insufficient BidCoins' }, { status: 400 })
      }

      const { data: purchase, error: purchaseErr } = await supabaseAdmin
        .from('raffle_purchases')
        .insert({
          raffle_id: raffle.id,
          buyer_id: user.id,
          quantity: qty,
          amount,
          status: 'succeeded',
          payment_method: 'bidcoin'
        })
        .select('*')
        .single()

      if (purchaseErr || !purchase) {
        return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 })
      }

      await spendBidcoins(
        user.id,
        amountInCoins,
        'raffle_purchase',
        { raffle_id: raffle.id, purchase_id: purchase.id, quantity: qty, method: 'bidcoin' },
        purchase.id,
        'raffle_purchases'
      )

      // Re-read the raffle to use the freshest tickets_sold before inserting entries.
      // This, together with the DB trigger that ends the raffle when full,
      // helps avoid overselling tickets in high-concurrency situations.
      const { data: freshRaffle } = await supabaseAdmin
        .from('raffles')
        .select('id, max_entries, tickets_sold, status')
        .eq('id', raffle.id)
        .single()

      const freshRemaining = Math.max(
        0,
        (freshRaffle?.max_entries || raffle.max_entries) - (freshRaffle?.tickets_sold || raffle.tickets_sold || 0)
      )

      const toInsert = Math.max(0, Math.min(qty, freshRemaining || qty))

      if (toInsert <= 0) {
        return NextResponse.json({ error: 'Raffle is full' }, { status: 400 })
      }

      const entries = Array.from({ length: toInsert }).map(() => ({
        raffle_id: raffle.id,
        buyer_id: user.id,
        purchase_id: purchase.id,
      }))
      await supabaseAdmin.from('raffle_entries').insert(entries)

      const earnedCoins = Math.round(amountInCoins * BIDCOIN_RAFFLE_EARN_RATE)
      if (earnedCoins > 0) {
        await awardBidcoins(
          user.id,
          earnedCoins,
          'raffle_purchase',
          { raffle_id: raffle.id, purchase_id: purchase.id, quantity: qty, reward_source: 'bidcoin_pay' },
          purchase.id,
          'raffle_purchases'
        )
      }

      return NextResponse.json({
        success: true,
        bidcoinPayment: true,
        purchaseId: purchase.id,
        entriesAdded: toInsert
      })
    }

    // Create a purchase row first (status pending)
    const { data: purchase, error: purchaseErr } = await supabaseAdmin
      .from('raffle_purchases')
      .insert({
        raffle_id: raffle.id,
        buyer_id: user.id,
        quantity: qty,
        amount,
        status: 'pending'
      })
      .select('*')
      .single()

    if (purchaseErr || !purchase) {
      return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 })
    }

    // PaymentIntent without transfer_data (funds remain on platform account)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: 'raffle_purchase',
        raffle_id: raffle.id,
        buyer_id: user.id,
        quantity: String(qty),
        purchase_id: purchase.id
      }
    })

    // Save PI id on purchase
    await supabaseAdmin
      .from('raffle_purchases')
      .update({ stripe_payment_intent_id: paymentIntent.id, status: paymentIntent.status })
      .eq('id', purchase.id)

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      purchaseId: purchase.id
    })
  } catch (error) {
    console.error('Create raffle purchase error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}