import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { adjustBidcoinBalance } from '../../../../lib/bidcoinService';
import { BIDCOIN_SIGNUP_BONUS } from '../../../../lib/bidcoinConstants';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    });

    let {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (authError || !user) {
      const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
      if (authHeader?.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token) {
          try {
            const tokenClient = createClient(supabaseUrl, supabaseAnonKey, {
              global: {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            });
            const { data: tokenUser, error: tokenError } = await tokenClient.auth.getUser();
            if (!tokenError && tokenUser?.user) {
              user = tokenUser.user;
            }
          } catch (tokenAuthError) {
            console.warn('BidCoin bonus token auth fallback failed', tokenAuthError);
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
      // Ensure the user record exists in public.users (trigger can lag under load)
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);

          if (authUser?.user) {
            await supabaseAdmin
              .from('users')
              .upsert(
                {
                  id: authUser.user.id,
                  email: authUser.user.email,
                  name:
                    (authUser.user.user_metadata as Record<string, any>)?.name ??
                    authUser.user.email ??
                    'BidWin User',
                },
                { onConflict: 'id' }
              );
          }
        } catch (profileError) {
          console.warn('Unable to upsert profile for BidCoin bonus', profileError);
        }
      }

      // Ensure wallet row exists
      await supabaseAdmin
        .from('user_bidcoins')
        .upsert(
          {
            user_id: user.id,
            balance: 0,
          },
          { onConflict: 'user_id' }
        );

      // Skip if bonus already granted
      const { data: priorBonus, error: priorBonusError } = await supabaseAdmin
        .from('bidcoin_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'signup_bonus')
        .limit(1);

      if (priorBonusError) {
        console.error('Failed to check prior signup bonus', priorBonusError);
        return NextResponse.json({ error: 'Unable to verify bonus status' }, { status: 500 });
      }

      if (priorBonus && priorBonus.length > 0) {
        return NextResponse.json({ success: false, error: 'Bonus already claimed' }, { status: 409 });
      }

      const newBalance = await adjustBidcoinBalance({
        userId: user.id,
        change: BIDCOIN_SIGNUP_BONUS,
        type: 'signup_bonus',
        metadata: { description: 'Welcome bonus' },
      });

      return NextResponse.json({ success: true, balance: newBalance });
    } catch (error: any) {
      if (
        error?.message?.includes('duplicate key value') ||
        error?.details?.includes('Insufficient BidCoins')
      ) {
        return NextResponse.json({ success: false, error: 'Bonus already claimed' }, { status: 409 });
      }
      console.error('BidCoin signup bonus failure', error);
      throw error;
    }
  } catch (error) {
    console.error('BidCoin signup bonus error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

