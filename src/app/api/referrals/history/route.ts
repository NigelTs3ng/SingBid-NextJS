import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const [{ data: referrals, error: referralsError }, { data: transactions, error: txError }] =
      await Promise.all([
        supabaseAdmin
          .from('users')
          .select('id, email, name, created_at')
          .eq('referred_by', user.id)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('bidcoin_transactions')
          .select('change, reference_id, metadata')
          .eq('user_id', user.id)
          .eq('type', 'referral'),
      ]);

    if (referralsError) {
      console.error('Referral history fetch error', referralsError);
      return NextResponse.json({ error: 'Failed to load referral history' }, { status: 500 });
    }

    if (txError) {
      console.warn('Referral transactions fetch error', txError);
    }

    const referralMap = new Map<string, number>();
    let totalCoins = 0;

    (transactions ?? []).forEach((tx) => {
      const direction = (tx.metadata as Record<string, any> | null | undefined)?.direction;
      const change = typeof tx.change === 'string' ? Number(tx.change) : tx.change ?? 0;

      if (direction === 'referrer') {
        totalCoins += change;
        if (tx.reference_id) {
          referralMap.set(tx.reference_id, (referralMap.get(tx.reference_id) ?? 0) + change);
        }
      }
    });

    const referralDetails = (referrals ?? []).map((ref) => ({
      id: ref.id,
      email: ref.email,
      name: ref.name,
      created_at: ref.created_at,
      coins_awarded: referralMap.get(ref.id) ?? 0,
    }));

    return NextResponse.json({
      referrals: referralDetails,
      totals: {
        referralCount: referralDetails.length,
        coinsEarned: totalCoins,
      },
    });
  } catch (error) {
    console.error('Referral history route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


