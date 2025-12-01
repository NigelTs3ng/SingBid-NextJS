import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// GET /api/raffles - list public raffles
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'active'

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin
      .from('raffles')
      .select('*')
      .eq('status', status)
      .gt('end_time', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch raffles' }, { status: 500 })
    }

    const raffles = data || []

    // Attach primary image URL per raffle
    let enriched = raffles
    if (raffles.length > 0) {
      const ids = raffles.map(r => r.id)
      const { data: imgs } = await supabaseAdmin
        .from('raffle_images')
        .select('raffle_id, image_url, is_primary, display_order')
        .in('raffle_id', ids)
        .order('display_order', { ascending: true })

      const map = new Map<string, string>()
      if (imgs) {
        // pick primary by flag else first by order
        for (const id of ids) {
          const list = imgs.filter(i => i.raffle_id === id)
          const primary = list.find(i => i.is_primary) || list[0]
          if (primary?.image_url) map.set(id, primary.image_url)
        }
      }

      // Fallback to storage if missing
      const bucket = 'auction-images'
      for (const id of ids) {
        if (!map.has(id)) {
          try {
            const prefix = `raffles/${id}`
            const { data: files } = await supabaseAdmin.storage.from(bucket).list(prefix, { limit: 1 })
            if (files && files[0]) {
              const path = `${prefix}/${files[0].name}`
              const { data: url } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
              if (url?.publicUrl) map.set(id, url.publicUrl)
            }
          } catch {}
        }
      }

      enriched = raffles.map(r => ({ ...r, primary_image_url: map.get(r.id) || null }))
    }

    return NextResponse.json({ raffles: enriched })
  } catch (error) {
    console.error('List raffles error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/raffles - create raffle (seller only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, ticket_price, max_entries, end_time } = body || {}

    if (!title || !ticket_price || !max_entries || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          }
        }
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

    // Optional: ensure user is seller
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (profile?.user_role !== 'seller') {
      return NextResponse.json({ error: 'Only sellers can create raffles' }, { status: 403 })
    }

    const insert = {
      seller_id: user.id,
      title,
      description: description || null,
      ticket_price: Number(ticket_price),
      max_entries: Number(max_entries),
      end_time,
      status: 'active',
    }

    const { data, error } = await supabaseAdmin
      .from('raffles')
      .insert(insert)
      .select('*')
      .single()

    if (error) {
      console.error('Create raffle error:', error)
      return NextResponse.json({ error: 'Failed to create raffle' }, { status: 500 })
    }

    return NextResponse.json({ raffle: data })
  } catch (error) {
    console.error('Create raffle error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}