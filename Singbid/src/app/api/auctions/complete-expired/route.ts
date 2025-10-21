import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST - Find and complete all expired auctions
export async function POST(request: NextRequest) {
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

    // Find auctions that have ended but are still active
    const now = new Date().toISOString()
    const { data: expiredAuctions, error: auctionsError } = await supabaseAdmin
      .from('auctions')
      .select('id, title, end_time')
      .eq('status', 'active')
      .lt('end_time', now)

    if (auctionsError) {
      console.error('Error fetching expired auctions:', auctionsError)
      return NextResponse.json(
        { error: 'Failed to fetch expired auctions' },
        { status: 500 }
      )
    }

    if (!expiredAuctions || expiredAuctions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired auctions found',
        completed: 0
      })
    }

    console.log(`Found ${expiredAuctions.length} expired auctions to complete`)

    const results = []
    
    // Complete each expired auction
    for (const auction of expiredAuctions) {
      try {
        // Call the completion API for each auction
        const completionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auctions/${auction.id}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const completionResult = await completionResponse.json()

        if (completionResponse.ok) {
          results.push({
            auctionId: auction.id,
            title: auction.title,
            status: 'completed',
            message: completionResult.message
          })
          console.log(`Completed auction ${auction.id}: ${auction.title}`)
        } else {
          results.push({
            auctionId: auction.id,
            title: auction.title,
            status: 'failed',
            error: completionResult.error
          })
          console.error(`Failed to complete auction ${auction.id}:`, completionResult.error)
        }

      } catch (error) {
        results.push({
          auctionId: auction.id,
          title: auction.title,
          status: 'error',
          error: error.message
        })
        console.error(`Error completing auction ${auction.id}:`, error)
      }
    }

    const completedCount = results.filter(r => r.status === 'completed').length
    const failedCount = results.filter(r => r.status !== 'completed').length

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredAuctions.length} expired auctions. ${completedCount} completed, ${failedCount} failed.`,
      completed: completedCount,
      failed: failedCount,
      results
    })

  } catch (error) {
    console.error('Auto-completion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Check for expired auctions (for monitoring)
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

    // Find auctions that have ended but are still active
    const now = new Date().toISOString()
    const { data: expiredAuctions, error: auctionsError } = await supabaseAdmin
      .from('auctions')
      .select(`
        id, 
        title, 
        end_time, 
        current_price,
        seller_id,
        users!seller_id(name, email)
      `)
      .eq('status', 'active')
      .lt('end_time', now)
      .order('end_time', { ascending: true })

    if (auctionsError) {
      console.error('Error fetching expired auctions:', auctionsError)
      return NextResponse.json(
        { error: 'Failed to fetch expired auctions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: expiredAuctions?.length || 0,
      auctions: expiredAuctions || []
    })

  } catch (error) {
    console.error('Error checking expired auctions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}