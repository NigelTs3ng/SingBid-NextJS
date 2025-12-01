import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// GET /api/raffles/[id]
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin
      .from('raffles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Raffle not found' }, { status: 404 })
    }

    // Fetch images from DB
    let images: any[] = []
    {
      const { data: dbImages } = await supabaseAdmin
        .from('raffle_images')
        .select('*')
        .eq('raffle_id', id)
        .order('display_order', { ascending: true })
      images = dbImages || []
    }

    // Fallback: if no DB images, try listing storage under raffles/<id>
    if (!images || images.length === 0) {
      try {
        const bucket = 'auction-images'
        const prefix = `raffles/${id}`
        const { data: files } = await supabaseAdmin.storage.from(bucket).list(prefix, { limit: 100 })
        if (files && files.length) {
          images = files
            .filter((f: any) => !f.name.startsWith('.'))
            .map((f: any, idx: number) => {
              const path = `${prefix}/${f.name}`
              const { data: url } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
              return {
                id: path,
                raffle_id: id,
                image_url: url?.publicUrl,
                image_path: path,
                display_order: idx,
                is_primary: idx === 0,
              }
            })
        }
      } catch (e) {
        // ignore fallback errors
      }
    }

    return NextResponse.json({ raffle: data, images: images || [] })
  } catch (error) {
    console.error('Get raffle error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/raffles/[id]
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const body = await request.json()
    const allowed = ['title','description','ticket_price','max_entries','end_time','status'] as const
    type RaffleUpdate = Partial<{
      title: string
      description: string | null
      ticket_price: number
      max_entries: number
      end_time: string
      status: 'draft' | 'active' | 'ended' | 'cancelled'
    }>
    const update: Partial<Record<(typeof allowed)[number], unknown>> = {}
    for (const k of allowed) if (k in body) update[k] = body[k]

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll(cs) { try { cs.forEach(({name,value,options})=>cookieStore.set(name,value,options)) } catch {} } } }
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

    // Verify ownership
    const { data: raffle } = await supabaseAdmin
      .from('raffles')
      .select('seller_id')
      .eq('id', id)
      .single()

    if (!raffle || raffle.seller_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('raffles')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update raffle' }, { status: 500 })
    }

    return NextResponse.json({ raffle: data })
  } catch (error) {
    console.error('Update raffle error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}