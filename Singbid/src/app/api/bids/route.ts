import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabase } from '../../../lib/supabase'
import { StripeService, stripe } from '../../../lib/stripe'
import { createClient } from '@supabase/supabase-js'

// POST - Place a new bid
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { auction_id, amount, payment_method_id } = body
    
    // Validate required fields
    if (!auction_id || !amount) {
      return NextResponse.json(
        { error: 'Auction ID and bid amount are required' },
        { status: 400 }
      )
    }
    
    // Payment method is required for authorization
    if (!payment_method_id) {
      return NextResponse.json(
        { error: 'Payment method is required to place bid. Please add a payment method first.' },
        { status: 400 }
      )
    }
    
    // Log payment method for debugging
    console.log('Using payment method:', payment_method_id);
    
    // Validate bid amount
    const bidAmount = parseFloat(amount)
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return NextResponse.json(
        { error: 'Bid amount must be a positive number' },
        { status: 400 }
      )
    }
    
    // Get auction details and current highest bid
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auction_id)
      .eq('status', 'active')
      .single()
    
    if (auctionError || !auction) {
      return NextResponse.json(
        { error: 'Auction not found or not active' },
        { status: 404 }
      )
    }
    
    // Check if auction has ended
    if (new Date(auction.end_time) <= new Date()) {
      return NextResponse.json(
        { error: 'Auction has ended' },
        { status: 400 }
      )
    }
    
    // Check if user is the seller (can't bid on own auction)
    if (auction.seller_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot bid on your own auction' },
        { status: 400 }
      )
    }
    
    // Check if bid amount is higher than current price
    if (bidAmount <= auction.current_price) {
      return NextResponse.json(
        { error: `Bid must be higher than current price of $${auction.current_price}` },
        { status: 400 }
      )
    }
    
    // Check minimum bid increment with more flexible rules
    let minIncrement = 1; // Default $1 increment
    
    // Dynamic increment based on current price
    if (auction.current_price >= 100) {
      minIncrement = 5; // $5 for auctions over $100
    }
    if (auction.current_price >= 500) {
      minIncrement = 10; // $10 for auctions over $500
    }
    if (auction.current_price >= 1000) {
      minIncrement = 25; // $25 for auctions over $1000
    }
    
    if (bidAmount < auction.current_price + minIncrement) {
      return NextResponse.json(
        { 
          error: `Minimum bid increment is $${minIncrement}. Your bid must be at least $${auction.current_price + minIncrement}`,
          current_price: auction.current_price,
          min_bid: auction.current_price + minIncrement,
          increment: minIncrement
        },
        { status: 400 }
      )
    }
    
    // Create admin client to bypass RLS for operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // This bypasses RLS
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Get user profile and ensure Stripe customer exists
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, email, name')
      .eq('id', user.id)
      .single()
    
    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }
    
    // Ensure user has Stripe customer
    let customerId = userProfile.stripe_customer_id
    if (!customerId) {
      const customer = await StripeService.createCustomer(userProfile.email, userProfile.name)
      customerId = customer.id
      
      await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }
    
    // Get seller's Stripe account for payment authorization
    const { data: sellerProfile, error: sellerError } = await supabaseAdmin
      .from('users')
      .select('stripe_account_id')
      .eq('id', auction.seller_id)
      .single()
    
    if (sellerError || !sellerProfile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Seller payment account not configured' },
        { status: 400 }
      )
    }
    
    // Ensure seller account has required capabilities
    try {
      await StripeService.ensureAccountCapabilities(sellerProfile.stripe_account_id)
    } catch (error) {
      console.error('Error ensuring account capabilities:', error)
      return NextResponse.json(
        { error: 'Seller account needs to complete Stripe onboarding for transfers' },
        { status: 400 }
      )
    }
    
    // Calculate platform fee
    const platformFee = StripeService.calculatePlatformFee(bidAmount)
    
    let paymentIntentId = null
    
    try {
      // Create payment authorization (hold funds) using manual capture method
      const paymentIntent = await StripeService.authorizePayment(
        bidAmount,
        'sgd',
        customerId,
        sellerProfile.stripe_account_id,
        platformFee,
        {
          auction_id: auction_id,
          bidder_id: user.id,
          bid_amount: bidAmount.toString()
        }
      )
      
      // Confirm the payment intent with the payment method to authorize funds
      const confirmedPayment = await StripeService.confirmPaymentAuthorization(
        paymentIntent.id,
        payment_method_id
      )
      
      // Check if payment was successfully authorized
      console.log('Payment confirmation result:', {
        id: confirmedPayment.id,
        status: confirmedPayment.status,
        client_secret: confirmedPayment.client_secret
      });
      
      if (confirmedPayment.status !== 'requires_capture') {
        console.error(`Payment status not requires_capture: ${confirmedPayment.status}`);
        // For development, allow succeeded status as well
        if (confirmedPayment.status !== 'succeeded') {
          throw new Error(`Payment authorization failed. Status: ${confirmedPayment.status}`);
        }
      }
      
      paymentIntentId = confirmedPayment.id
      console.log('Created and confirmed payment authorization:', paymentIntentId)
      console.log('Payment status:', confirmedPayment.status)
      
    } catch (error) {
      console.error('Payment authorization error:', error)
      
      // If the connect account error occurs, fall back to a simple payment intent
      if (error.code === 'insufficient_capabilities_for_transfer') {
        try {
          // Create simple payment intent - funds go to SingBid account
          const simplePaymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(bidAmount * 100), // Full amount to SingBid
            currency: 'sgd',
            customer: customerId,
            capture_method: 'manual',
            payment_method: payment_method_id,
            confirm: true,
            metadata: {
              auction_id: auction_id,
              bidder_id: user.id,
              bid_amount: bidAmount.toString(),
              type: 'bid_authorization',
              seller_account_id: sellerProfile.stripe_account_id,
              platform_fee: platformFee.toString(),
              seller_amount: (bidAmount - platformFee).toString()
            }
          })
          
          // Check if fallback payment was successfully authorized
          if (simplePaymentIntent.status !== 'requires_capture') {
            throw new Error(`Fallback payment authorization failed. Status: ${simplePaymentIntent.status}`)
          }
          
          paymentIntentId = simplePaymentIntent.id
          console.log('Created and confirmed simple payment intent:', paymentIntentId)
          console.log('Payment status:', simplePaymentIntent.status)
          
        } catch (fallbackError) {
          console.error('Fallback payment creation failed:', fallbackError)
          return NextResponse.json(
            { error: 'Payment authorization failed. Please check your payment method.' },
            { status: 400 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Payment authorization failed. Please check your payment method.' },
          { status: 400 }
        )
      }
    }
    
    // Cancel previous payment authorizations for outbid bidders
    const { data: previousBids } = await supabaseAdmin
      .from('bids')
      .select('stripe_payment_intent_id')
      .eq('auction_id', auction_id)
      .eq('status', 'active')
      .not('stripe_payment_intent_id', 'is', null)
    
    // Cancel previous authorizations in background (don't block bid placement)
    if (previousBids && previousBids.length > 0) {
      for (const prevBid of previousBids) {
        try {
          await StripeService.cancelPaymentAuthorization(prevBid.stripe_payment_intent_id)
        } catch (error) {
          console.error('Failed to cancel previous authorization:', error)
          // Continue anyway - we'll clean up later
        }
      }
    }
    
    // Create the bid with payment authorization data
    console.log('Creating bid with data:', {
      auction_id,
      bidder_id: user.id,
      amount: bidAmount,
      status: 'active',
      stripe_payment_intent_id: paymentIntentId,
      authorization_status: 'authorized',
      authorized_amount: bidAmount
    });
    
    const { data: bidData, error: bidError } = await supabaseAdmin
      .from('bids')
      .insert({
        auction_id,
        bidder_id: user.id,
        amount: bidAmount,
        status: 'active',
        stripe_payment_intent_id: paymentIntentId,
        authorization_status: 'authorized',
        authorized_amount: bidAmount
      })
      .select()
      .single()
      
    console.log('Bid creation result:', { bidData, bidError });
    
    if (bidError) {
      console.error('Bid creation error:', bidError)
      return NextResponse.json(
        { error: 'Failed to place bid' },
        { status: 500 }
      )
    }
    
    // Update auction current price using admin client
    const { error: updateError } = await supabaseAdmin
      .from('auctions')
      .update({ 
        current_price: bidAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', auction_id)
    
    if (updateError) {
      console.error('Auction update error:', updateError)
      // TODO: Consider rolling back the bid if auction update fails
    }
    
    // Mark previous bids as outbid using admin client
    await supabaseAdmin
      .from('bids')
      .update({ status: 'outbid' })
      .eq('auction_id', auction_id)
      .neq('id', bidData.id)
      .eq('status', 'active')
    
    return NextResponse.json({
      success: true,
      bid: bidData,
      new_current_price: bidAmount,
      payment_authorized: true,
      authorization_id: paymentIntentId
    })
    
  } catch (error) {
    console.error('Bid placement error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Retrieve bids for an auction
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
    
    // Create admin client for consistent data access
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('Fetching bids with params:', { auctionId, userId })
    
    let query = supabaseAdmin
      .from('bids')
      .select(`
        *,
        users!bidder_id(id, name, email),
        auctions!auction_id(id, title, status, end_time)
      `)
      .order('created_at', { ascending: false })
    
    if (auctionId) {
      query = query.eq('auction_id', auctionId)
    }
    
    if (userId) {
      query = query.eq('bidder_id', userId)
    }
    
    const { data: bids, error } = await query
    
    console.log('Bids query result:', { 
      count: bids?.length || 0, 
      error,
      sampleBid: bids?.[0] ? {
        id: bids[0].id,
        amount: bids[0].amount,
        status: bids[0].status,
        authorization_status: bids[0].authorization_status,
        auction_title: bids[0].auctions?.title
      } : null
    })
    
    if (error) {
      console.error('Error fetching bids:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bids' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      bids: bids || []
    })
    
  } catch (error) {
    console.error('Error fetching bids:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}