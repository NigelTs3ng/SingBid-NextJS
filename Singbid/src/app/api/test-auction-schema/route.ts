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
          persistSession: false
        }
      }
    )

    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get('auction_id')
    
    if (!auctionId) {
      return NextResponse.json({
        error: 'auction_id required'
      }, { status: 400 })
    }

    // Get auction to see its structure
    const { data: auction, error } = await supabaseAdmin
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single()

    if (error) {
      return NextResponse.json({
        error: error.message,
        details: error
      }, { status: 500 })
    }

    // Try a simple status update to test what works
    const { error: updateError } = await supabaseAdmin
      .from('auctions')
      .update({ status: 'active' })  // Change it back to active
      .eq('id', auctionId)

    return NextResponse.json({
      success: true,
      auction_data: auction,
      available_columns: Object.keys(auction || {}),
      update_test_error: updateError,
      can_update_status: !updateError
    })

  } catch (error) {
    console.error('Schema test error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}