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

    // Check if user has subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If no subscription exists, create a default standard subscription
    if (!subscription && !subError) {
      const { data: newSub, error: insertError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_type: 'standard',
          status: 'active',
          start_date: new Date().toISOString(),
        })
        .select('*')
        .single()

      if (insertError) {
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
      }

      return NextResponse.json(newSub)
    }

    if (subError && subError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
    }

    return NextResponse.json(subscription || {
      plan_type: 'standard',
      status: 'active',
      start_date: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Subscription GET error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const { plan_type, action } = await request.json()

    if (!plan_type || !['standard', 'premium'].includes(plan_type)) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get current subscription
    const { data: currentSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!currentSub) {
      // Create new subscription
      const { data: newSub, error: insertError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_type,
          status: 'active',
          start_date: new Date().toISOString(),
        })
        .select('*')
        .single()

      if (insertError) {
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
      }

      return NextResponse.json({ success: true, subscription: newSub })
    }

    // Update subscription
    let updateData: any = { plan_type }

    if (action === 'cancel') {
      updateData.status = 'cancelled'
      updateData.end_date = new Date().toISOString()
    } else if (action === 'upgrade' || action === 'downgrade') {
      updateData.status = 'active'
      // For premium, set end_date to 30 days from now
      if (plan_type === 'premium') {
        updateData.end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    }

    const { data: updatedSub, error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true, subscription: updatedSub })
  } catch (e) {
    console.error('Subscription POST error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
