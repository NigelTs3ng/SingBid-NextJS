import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/raffles/[id]/entries - list entries (count and user entries if provided)
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { count, error } = await supabaseAdmin
      .from('raffle_entries')
      .select('*', { count: 'exact', head: true })
      .eq('raffle_id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
    }

    let userEntries: { id: string; created_at: string }[] = []
    if (userId) {
      const { data } = await supabaseAdmin
        .from('raffle_entries')
        .select('id, created_at')
        .eq('raffle_id', id)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false })
      userEntries = data || []
    }

    return NextResponse.json({ count: count || 0, userEntries })
  } catch (error) {
    console.error('List entries error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}