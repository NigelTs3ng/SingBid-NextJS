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

    // Get query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const auctionId = searchParams.get('auction_id')

    if (!userId && !auctionId) {
      return NextResponse.json(
        { error: 'user_id or auction_id required' },
        { status: 400 }
      )
    }

    console.log('Testing bids query with:', { userId, auctionId })

    // Get all bids for testing
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

    if (userId) {
      query = query.eq('bidder_id', userId)
    }

    if (auctionId) {
      query = query.eq('auction_id', auctionId)
    }

    const { data: bids, error } = await query

    console.log('Bids query result:', { bids, error })

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          details: error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: bids?.length || 0,
      bids: bids || [],
      query_params: { userId, auctionId },
    })
  } catch (error: unknown) {
    console.error('Test bids error:', error)

    // ✅ Safely extract message even if error is unknown
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
