import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// POST /api/raffles/[id]/images - insert raffle images (seller only)
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const body = await request.json()
    const images = (body?.images || []) as Array<{
      image_url: string
      image_path?: string | null
      display_order?: number
      is_primary?: boolean
      alt_text?: string | null
      file_size?: number | null
      mime_type?: string | null
      width?: number | null
      height?: number | null
    }>

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll(cs) { try { cs.forEach(({name,value,options})=>cookieStore.set(name,value,options)) } catch {} } } }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify seller owns this raffle
    const { data: raffle } = await supabaseAdmin
      .from('raffles')
      .select('seller_id')
      .eq('id', id)
      .single()

    if (!raffle || raffle.seller_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const rows = images.map((img) => ({
      raffle_id: id,
      image_url: img.image_url,
      image_path: img.image_path || null,
      display_order: img.display_order ?? 0,
      is_primary: !!img.is_primary,
      alt_text: img.alt_text || null,
      file_size: img.file_size || null,
      mime_type: img.mime_type || null,
      width: img.width || null,
      height: img.height || null,
    }))

    const { data, error } = await supabaseAdmin
      .from('raffle_images')
      .insert(rows)
      .select('*')

    if (error) return NextResponse.json({ error: 'Failed to save images' }, { status: 500 })

    return NextResponse.json({ images: data || [] })
  } catch (e) {
    console.error('Save raffle images error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
