import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getBidcoinBalance, getBidcoinTransactions } from '../../../../lib/bidcoinService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    let {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');

      if (authHeader?.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token) {
          try {
            const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            });
            const { data: tokenUser, error: tokenError } = await supabaseAdmin.auth.getUser(token);
            if (!tokenError && tokenUser?.user) {
              user = tokenUser.user;
            } else if (tokenError) {
              console.warn('BidCoin balance token validation error', tokenError);
            }
          } catch (tokenAuthError) {
            console.warn('BidCoin balance token auth fallback failed', tokenAuthError);
          }
        }
      }

      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    const balanceRaw = await getBidcoinBalance(user.id);
    const balance = typeof balanceRaw === 'string' ? Number(balanceRaw) : balanceRaw ?? 0;
    console.log('[api/bidcoins/me] user', user.id, 'balance', balance);
    const transactions = await getBidcoinTransactions(user.id);
    const usdValue = balance / 100;

    return NextResponse.json(
      {
        balance,
        usdValue,
        displayValue: {
          bidcoins: balance,
          usd: usdValue,
        },
        transactions: transactions ?? [],
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('BidCoin GET error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

