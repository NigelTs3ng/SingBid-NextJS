import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// GET: list payouts and summary for current seller
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

    // Verify seller role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, user_role, stripe_account_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (profile.user_role !== 'seller') {
      return NextResponse.json({ error: 'Only sellers can view payouts' }, { status: 403 })
    }

    // Sum completed seller amounts
    const { data: completedPayments, error: payErr } = await supabaseAdmin
      .from('payments')
      .select('id, seller_amount')
      .eq('seller_id', user.id)
      .eq('status', 'completed')

    if (payErr) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }
    const totalCompleted = (completedPayments || []).reduce((sum, p: any) => sum + (p.seller_amount || 0), 0)

    // Sum already allocated to payouts (any non-cancelled payout)
    const { data: payoutAllocations, error: itemsErr } = await supabaseAdmin
      .from('payout_items')
      .select('amount, payout:payouts!inner(status, seller_id)')

    if (itemsErr) {
      return NextResponse.json({ error: 'Failed to fetch payout items' }, { status: 500 })
    }

    const sellerAllocations = (payoutAllocations || []).filter((row: any) => row.payout?.seller_id === user.id && row.payout?.status !== 'cancelled')
    const allocatedTotal = sellerAllocations.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)

    const available = Math.max(0, Math.round((totalCompleted - allocatedTotal) * 100) / 100)

    // Fetch payouts list for seller
    const { data: payouts, error: payoutsErr } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('seller_id', user.id)
      .order('requested_at', { ascending: false })

    if (payoutsErr) {
      return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
    }

    return NextResponse.json({
      summary: {
        total_completed: totalCompleted,
        allocated_total: allocatedTotal,
        available,
        stripe_account_id: profile.stripe_account_id || null,
      },
      payouts: payouts || [],
    })
  } catch (e) {
    console.error('Payouts GET error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: request payout for all available completed payments not yet allocated
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
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

    // Verify seller role and account
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, user_role, stripe_account_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (profile.user_role !== 'seller') {
      return NextResponse.json({ error: 'Only sellers can request payouts' }, { status: 403 })
    }

    // Gather completed payments for seller not yet in any payout
    const { data: completedPayments, error: payErr } = await supabaseAdmin
      .from('payments')
      .select('id, seller_amount')
      .eq('seller_id', user.id)
      .eq('status', 'completed')

    if (payErr) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const { data: allItems, error: itemsErr } = await supabaseAdmin
      .from('payout_items')
      .select('payment_id, payout:payouts!inner(status, seller_id)')

    if (itemsErr) {
      return NextResponse.json({ error: 'Failed to fetch payout items' }, { status: 500 })
    }

    const allocatedPaymentIds = new Set(
      (allItems || [])
        .filter((r: any) => r.payout?.seller_id === user.id && r.payout?.status !== 'cancelled')
        .map((r: any) => r.payment_id)
    )

    const eligible = (completedPayments || []).filter((p: any) => !allocatedPaymentIds.has(p.id))
    const amountTotal = Math.round((eligible.reduce((s: number, p: any) => s + (p.seller_amount || 0), 0)) * 100) / 100

    if (!amountTotal || amountTotal <= 0) {
      return NextResponse.json({ error: 'No funds available for payout' }, { status: 400 })
    }

    // Create payout row
    const { data: payout, error: payoutErr } = await supabaseAdmin
      .from('payouts')
      .insert({
        seller_id: user.id,
        status: 'requested',
        amount_total: amountTotal,
        fee_total: 0,
        currency: 'usd',
        destination_account_id: profile.stripe_account_id || null,
        requested_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (payoutErr || !payout) {
      return NextResponse.json({ error: 'Failed to create payout request' }, { status: 500 })
    }

    // Create payout_items
    const items = eligible.map((p: any) => ({
      payout_id: payout.id,
      payment_id: p.id,
      amount: p.seller_amount,
    }))

    const { error: insertItemsErr } = await supabaseAdmin
      .from('payout_items')
      .insert(items)

    if (insertItemsErr) {
      return NextResponse.json({ error: 'Failed to attach payout items' }, { status: 500 })
    }

    return NextResponse.json({ success: true, payout })
  } catch (e) {
    console.error('Payouts POST error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}