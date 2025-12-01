import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
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
            } catch {}
          },
        },
      }
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

    // Verify user is a seller
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, user_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.user_role !== 'seller') {
      return NextResponse.json({ error: 'Only sellers can view analytics' }, { status: 403 })
    }

    // Fetch all seller's auctions
    const { data: auctions, error: auctionsError } = await supabaseAdmin
      .from('auctions')
      .select('id, title, status, starting_price, current_price, end_time, created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (auctionsError) {
      return NextResponse.json({ error: 'Failed to fetch auctions' }, { status: 500 })
    }

    // Fetch all bids on seller's auctions
    const { data: bids, error: bidsError } = await supabaseAdmin
      .from('bids')
      .select('id, auction_id, amount, created_at')
      .in('auction_id', (auctions || []).map(a => a.id))

    if (bidsError) {
      return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 })
    }

    // Fetch completed payments (sales)
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('id, auction_id, amount, platform_fee, seller_amount, status, created_at')
      .eq('seller_id', user.id)
      .eq('status', 'completed')

    if (paymentsError) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // Calculate analytics
    const auctionsList = auctions || []
    const bidsList = bids || []
    const paymentsList = payments || []

    const stats = {
      totalAuctions: auctionsList.length,
      activeAuctions: auctionsList.filter(a => a.status === 'active').length,
      completedAuctions: auctionsList.filter(a => a.status === 'ended').length,
      cancelledAuctions: auctionsList.filter(a => a.status === 'cancelled').length,
      totalRevenue: paymentsList.reduce((sum, p: any) => sum + (p.amount || 0), 0),
      totalBids: bidsList.length,
      averageBidsPerAuction: auctionsList.length > 0 
        ? Math.round((bidsList.length / auctionsList.length) * 100) / 100 
        : 0,
      averageSellingPrice: auctionsList.length > 0
        ? Math.round((paymentsList.reduce((sum, p: any) => sum + (p.amount || 0), 0) / paymentsList.length) * 100) / 100
        : 0,
      totalEarnings: paymentsList.reduce((sum, p: any) => sum + (p.seller_amount || 0), 0),
      totalFeesCollected: paymentsList.reduce((sum, p: any) => sum + (p.platform_fee || 0), 0),
    }

    // Group auctions by status with additional metrics
    const auctionsByStatus = {
      active: auctionsList.filter(a => a.status === 'active').map(a => ({
        id: a.id,
        title: a.title,
        current_price: a.current_price,
        bids_count: bidsList.filter(b => b.auction_id === a.id).length,
        created_at: a.created_at,
      })),
      ended: auctionsList.filter(a => a.status === 'ended').map(a => {
        const payment = paymentsList.find(p => p.auction_id === a.id)
        return {
          id: a.id,
          title: a.title,
          final_price: a.current_price,
          revenue: payment?.amount || 0,
          bids_count: bidsList.filter(b => b.auction_id === a.id).length,
          end_time: a.end_time,
        }
      }),
    }

    // Get recent activity (last 10 bids)
    const recentActivity = bidsList
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((bid: any) => {
        const auction = auctionsList.find(a => a.id === bid.auction_id)
        return {
          type: 'bid',
          description: `Bid of ${bid.amount} on "${auction?.title}"`,
          amount: bid.amount,
          timestamp: bid.created_at,
        }
      })

    // Get payment history (last 10)
    const paymentHistory = paymentsList
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((payment: any) => {
        const auction = auctionsList.find(a => a.id === payment.auction_id)
        return {
          id: payment.id,
          auction: auction?.title,
          amount: payment.amount,
          seller_amount: payment.seller_amount,
          status: payment.status,
          created_at: payment.created_at,
        }
      })

    return NextResponse.json({
      stats,
      auctionsByStatus,
      recentActivity,
      paymentHistory,
    })
  } catch (e) {
    console.error('Analytics GET error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
