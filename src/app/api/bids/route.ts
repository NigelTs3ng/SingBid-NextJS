import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabase } from '../../../lib/supabase'
import { StripeService } from '../../../lib/stripe'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// POST - Place a new bid
export async function POST(request: NextRequest) {
  // Hoisted so they're visible in catch/finally
  let bidcoinHold = 0
  let paymentMethod: 'bidcoin' | 'card' = 'card'
  let paymentIntentId: string | null = null
  let supabaseAdmin: SupabaseClient | null = null
  let user: { id: string } | null = null
  let auction_id: string | null = null
  let bidAmount = 0

  try {
    // Auth (server-side)
    const cookieStore = await cookies() // 👈 await the Promise
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // In some runtimes cookieStore is Readonly and has no .set — guard it.
            try {
              const maybeWritable = cookieStore as any
              if (typeof maybeWritable?.set === 'function') {
                cookiesToSet.forEach(({ name, value, options }) => {
                  maybeWritable.set(name, value, options)
                })
              }
            } catch {
              // Called from a context where setting is not allowed (e.g., RSC). Ignore.
            }
          },
        },
      }
    )

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser()
    user = authData?.user ?? null

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    auction_id = body.auction_id ?? null
    const amountRaw = body.amount
    const payment_method_id: string | null = body.payment_method_id ?? null
    const bidcoin_payment: boolean = body.bidcoin_payment ?? false
    paymentMethod = bidcoin_payment ? 'bidcoin' : 'card'

    if (!auction_id || amountRaw === undefined || amountRaw === null) {
      return NextResponse.json(
        { error: 'Auction ID and bid amount are required' },
        { status: 400 }
      )
    }

    // Validate amount
    bidAmount = typeof amountRaw === 'number' ? amountRaw : parseFloat(String(amountRaw))
    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      return NextResponse.json(
        { error: 'Bid amount must be a positive number' },
        { status: 400 }
      )
    }

    // Card flow requires a payment method
    if (!bidcoin_payment && !payment_method_id) {
      return NextResponse.json(
        { error: 'Payment method is required to place bid. Please add a payment method first or use BidCoins.' },
        { status: 400 }
      )
    }

    console.log('Bid payment method:', paymentMethod, payment_method_id ?? '(n/a)')

    // Load auction
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auction_id)
      .eq('status', 'active')
      .single()

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found or not active' }, { status: 404 })
    }

    // Not past end time
    if (new Date(auction.end_time) <= new Date()) {
      return NextResponse.json({ error: 'Auction has ended' }, { status: 400 })
    }

    // Seller cannot bid own auction
    if (auction.seller_id === user.id) {
      return NextResponse.json({ error: 'Cannot bid on your own auction' }, { status: 400 })
    }

    // Must exceed current price
    if (bidAmount <= auction.current_price) {
      return NextResponse.json(
        { error: `Bid must be higher than current price of $${auction.current_price}` },
        { status: 400 }
      )
    }

    // Dynamic minimum increment
    let minIncrement = 1
    if (auction.current_price >= 100) minIncrement = 5
    if (auction.current_price >= 500) minIncrement = 10
    if (auction.current_price >= 1000) minIncrement = 25

    if (bidAmount < auction.current_price + minIncrement) {
      return NextResponse.json(
        {
          error: `Minimum bid increment is $${minIncrement}. Your bid must be at least $${auction.current_price + minIncrement}`,
          current_price: auction.current_price,
          min_bid: auction.current_price + minIncrement,
          increment: minIncrement,
        },
        { status: 400 }
      )
    }

    // Admin client to bypass RLS for server ops
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get user profile (stripe id, etc.)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, email, name')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    let customerId: string | null = userProfile.stripe_customer_id ?? null

    // ===== Payment authorization / hold =====
    if (bidcoin_payment) {
      // Reserve BidCoins (100 coins = $1 assumed)
      const amountInCoins = Math.round(bidAmount * 100)

      const { data: wallet } = await supabaseAdmin
        .from('user_bidcoins')
        .select('balance')
        .eq('user_id', user.id)
        .single()

      const balance = wallet?.balance ?? 0
      if (balance < amountInCoins) {
        return NextResponse.json(
          { error: 'Insufficient BidCoins for this bid. Please top up or use card.' },
          { status: 400 }
        )
      }

      const { error: holdError } = await supabaseAdmin.rpc('bidcoin_adjust_balance', {
        p_user_id: user.id,
        p_change: -amountInCoins,
        p_type: 'auction_purchase',
        p_reference_id: auction_id,
        p_reference_table: 'auctions',
        p_metadata: JSON.stringify({ hold: true }),
      })

      if (holdError) {
        console.error('BidCoin hold error:', holdError)
        return NextResponse.json(
          { error: 'Failed to reserve BidCoins for this bid.' },
          { status: 400 }
        )
      }

      bidcoinHold = amountInCoins
    } else {
      // Ensure Stripe customer exists
      if (!customerId) {
        const customer = await StripeService.createCustomer(userProfile.email, userProfile.name)
        customerId = customer.id
        await supabaseAdmin
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id)
      }

      // Seller must have connected account
      const { data: sellerProfile, error: sellerError } = await supabaseAdmin
        .from('users')
        .select('stripe_account_id')
        .eq('id', auction.seller_id)
        .single()

      if (sellerError || !sellerProfile?.stripe_account_id) {
        console.log('Seller payment account check failed:', {
          sellerError,
          hasAccountId: !!sellerProfile?.stripe_account_id,
        })
        return NextResponse.json(
          {
            error:
              'Cannot place bid: The seller has not completed their payment setup. Please contact the seller or try another auction.',
            code: 'SELLER_PAYMENT_NOT_CONFIGURED',
            details: 'Seller payment account not configured',
          },
          { status: 400 }
        )
      }

      // Capabilities
      try {
        await StripeService.ensureAccountCapabilities(sellerProfile.stripe_account_id)
      } catch (err) {
        console.error('Error ensuring account capabilities:', err)
        return NextResponse.json(
          { error: 'Seller account needs to complete Stripe onboarding for transfers' },
          { status: 400 }
        )
      }

      const platformFee = StripeService.calculatePlatformFee(bidAmount)

      // Authorize & confirm (captures later on auction completion)
      try {
        const paymentIntent = await StripeService.authorizePayment(
          bidAmount,
          'usd',
          customerId,
          sellerProfile.stripe_account_id,
          platformFee,
          {
            auction_id,
            bidder_id: user.id,
            bid_amount: bidAmount.toString(),
          }
        )

        const confirmedPayment = await StripeService.confirmPaymentAuthorization(
          paymentIntent.id,
          payment_method_id!
        )

        if (
          confirmedPayment.status !== 'requires_capture' &&
          confirmedPayment.status !== 'succeeded'
        ) {
          throw new Error(`Payment authorization failed. Status: ${confirmedPayment.status}`)
        }

        paymentIntentId = confirmedPayment.id
        console.log('Created and confirmed payment authorization:', paymentIntentId)
      } catch (err) {
        console.error('Payment authorization error:', err)
        return NextResponse.json(
          { error: 'Payment authorization failed. Please check your payment method.' },
          { status: 400 }
        )
      }
    }

    // Cancel previous card authorizations (non-blocking)
    const { data: previousCardBids } = await supabaseAdmin
      .from('bids')
      .select('id, stripe_payment_intent_id')
      .eq('auction_id', auction_id)
      .eq('status', 'active')
      .not('stripe_payment_intent_id', 'is', null)

    if (previousCardBids?.length) {
      for (const prev of previousCardBids) {
        if (!prev.stripe_payment_intent_id) continue
        try {
          await StripeService.cancelPaymentAuthorization(prev.stripe_payment_intent_id)
        } catch (err) {
          console.error('Failed to cancel previous authorization:', err)
        }
      }
    }

    // Previous BidCoin holds to release
    const { data: previousBidcoinBids } = await supabaseAdmin
      .from('bids')
      .select('id, bidder_id, bidcoin_hold, holds_released')
      .eq('auction_id', auction_id)
      .eq('status', 'active')
      .gt('bidcoin_hold', 0)
      .is('holds_released', false)

    // Insert the new bid
    console.log('Creating bid with data:', {
      auction_id,
      bidder_id: user.id,
      amount: bidAmount,
      status: 'active',
      payment_method: paymentMethod,
      stripe_payment_intent_id: paymentIntentId,
      bidcoin_hold: bidcoinHold,
      authorization_status: 'authorized',
      authorized_amount: bidAmount,
    })

    const { data: bidData, error: bidError } = await supabaseAdmin
      .from('bids')
      .insert({
        auction_id: auction_id!,
        bidder_id: user.id,
        amount: bidAmount,
        status: 'active',
        payment_method: paymentMethod,
        stripe_payment_intent_id: paymentIntentId,
        bidcoin_hold: bidcoinHold,
        holds_released: paymentMethod === 'bidcoin' ? false : true,
        authorization_status: 'authorized',
        authorized_amount: bidAmount,
      })
      .select()
      .single()

    console.log('Bid creation result:', { bidData, bidError })

    if (bidError || !bidData) {
      // Release our hold if insert failed
      if (paymentMethod === 'bidcoin' && bidcoinHold > 0) {
        try {
          await supabaseAdmin.rpc('bidcoin_adjust_balance', {
            p_user_id: user.id,
            p_change: bidcoinHold,
            p_type: 'auction_purchase',
            p_reference_id: auction_id,
            p_reference_table: 'auctions',
            p_metadata: JSON.stringify({ hold_release: true, reason: 'insert_failed' }),
          })
        } catch (releaseError) {
          console.error('Failed to release BidCoin hold after bid insert failure', releaseError)
        }
      }

      console.error('Bid creation error:', bidError)
      return NextResponse.json({ error: 'Failed to place bid' }, { status: 500 })
    }

    // Update auction current price
    const { error: updateError } = await supabaseAdmin
      .from('auctions')
      .update({
        current_price: bidAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auction_id)

    if (updateError) {
      console.error('Auction update error:', updateError)
    }

    // Mark all other active bids as outbid
    await supabaseAdmin
      .from('bids')
      .update({ status: 'outbid' })
      .eq('auction_id', auction_id)
      .neq('id', bidData.id)
      .eq('status', 'active')

    // Release previous BidCoin holds (they’re outbid now)
    if (previousBidcoinBids?.length) {
      for (const prev of previousBidcoinBids) {
        if (prev.holds_released) continue
        try {
          await supabaseAdmin.rpc('bidcoin_adjust_balance', {
            p_user_id: prev.bidder_id,
            p_change: prev.bidcoin_hold,
            p_type: 'auction_purchase',
            p_reference_id: auction_id,
            p_reference_table: 'auctions',
            p_metadata: JSON.stringify({ hold_release: true }),
          })

          await supabaseAdmin
            .from('bids')
            .update({ holds_released: true, bidcoin_hold: 0 })
            .eq('id', prev.id)
        } catch (releaseError) {
          console.error('Failed to release BidCoin hold for bid', prev.id, releaseError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      bid: bidData,
      new_current_price: bidAmount,
      payment_authorized: paymentMethod === 'card',
      authorization_id: paymentIntentId,
      payment_method: paymentMethod,
      bidcoin_hold: bidcoinHold,
    })
  } catch (error) {
    console.error('Bid placement error:', error)
    if (bidcoinHold > 0 && supabaseAdmin && user && auction_id) {
      try {
        await supabaseAdmin.rpc('bidcoin_adjust_balance', {
          p_user_id: user.id,
          p_change: bidcoinHold,
          p_type: 'auction_purchase',
          p_reference_id: auction_id,
          p_reference_table: 'auctions',
          p_metadata: JSON.stringify({ hold_release: true, reason: 'exception' }),
        })
      } catch (releaseError) {
        console.error('Failed to release BidCoin hold after exception', releaseError)
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Retrieve bids for an auction or user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get('auction_id')
    const userId = searchParams.get('user_id')

    if (!auctionId && !userId) {
      return NextResponse.json(
        { error: 'Either auction_id or user_id is required' },
        { status: 400 }
      )
    }

    // Admin client for consistent access
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    console.log('Fetching bids with params:', { auctionId, userId })

    let query = supabaseAdmin
      .from('bids')
      .select(
        `
        *,
        users!bidder_id(id, name, email),
        auctions!auction_id(id, title, status, end_time)
      `
      )
      .order('created_at', { ascending: false })

    if (auctionId) query = query.eq('auction_id', auctionId)
    if (userId) query = query.eq('bidder_id', userId)

    const { data: bids, error } = await query

    console.log('Bids query result:', {
      count: bids?.length || 0,
      error,
      sampleBid: bids?.[0]
        ? {
            id: bids[0].id,
            amount: bids[0].amount,
            status: bids[0].status,
            authorization_status: bids[0].authorization_status,
            auction_title: (bids[0] as any)?.auctions?.title,
          }
        : null,
    })

    if (error) {
      console.error('Error fetching bids:', error)
      return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 })
    }

    return NextResponse.json({ bids: bids || [] })
  } catch (error) {
    console.error('Error fetching bids:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
