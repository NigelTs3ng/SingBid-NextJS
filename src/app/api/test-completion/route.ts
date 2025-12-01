import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Create admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get('auction_id')

    if (!auctionId) {
      return NextResponse.json(
        { error: 'auction_id required' },
        { status: 400 }
      )
    }

    console.log('Testing completion readiness for auction:', auctionId)

    // Get auction details
    const { data: auction, error: auctionError } = await supabaseAdmin
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single()

    if (auctionError || !auction) {
      return NextResponse.json(
        {
          error: 'Auction not found',
          details: auctionError,
        },
        { status: 404 }
      )
    }

    // Get winning bid
    const { data: winningBid, error: bidError } = await supabaseAdmin
      .from('bids')
      .select(
        `
        *,
        users!bidder_id(id, name, email)
      `
      )
      .eq('auction_id', auctionId)
      .eq('status', 'active')
      .order('amount', { ascending: false })
      .limit(1)
      .single()

    // Get all bids for context
    const { data: allBids } = await supabaseAdmin
      .from('bids')
      .select('*')
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false })

    return NextResponse.json({
      success: true,
      auction: {
        id: auction.id,
        title: auction.title,
        status: auction.status,
        current_price: auction.current_price,
        end_time: auction.end_time,
        seller_id: auction.seller_id,
      },
      winning_bid: winningBid
        ? {
            id: winningBid.id,
            amount: winningBid.amount,
            status: winningBid.status,
            authorization_status: winningBid.authorization_status,
            stripe_payment_intent_id: winningBid.stripe_payment_intent_id,
            bidder: winningBid.users,
          }
        : null,
      bid_error: bidError,
      total_bids: allBids?.length || 0,
      all_bids:
        allBids?.map((bid) => ({
          id: bid.id,
          amount: bid.amount,
          status: bid.status,
          authorization_status: bid.authorization_status,
        })) || [],
      completion_ready: !!winningBid && auction.status === 'active',
      issues: [],
    })
  } catch (error: unknown) {
    console.error('Test completion error:', error)

    // ✅ Safely extract message even if `error` is unknown
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: message,
      },
      { status: 500 }
    )
  }
}
