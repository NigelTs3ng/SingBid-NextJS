import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { adjustBidcoinBalance, BidcoinTransactionType } from '../../../../lib/bidcoinService';

interface EarnRequestBody {
  userId: string;
  amount: number; // BidCoins (in integer coins, e.g. 200 = 200 BidCoins = $2.00)
  type: BidcoinTransactionType;
  referenceId?: string | null;
  referenceTable?: string | null;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EarnRequestBody;

    if (!body?.userId || !body?.amount || !body?.type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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

    if (user.id !== body.userId) {
      return NextResponse.json({ error: 'Cannot modify another user balance' }, { status: 403 });
    }

    const change = Math.round(body.amount); // amount already in BidCoins (1 coin = 1 cent)
    if (change <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const newBalance = await adjustBidcoinBalance({
      userId: body.userId,
      change,
      type: body.type,
      referenceId: body.referenceId,
      referenceTable: body.referenceTable,
      metadata: body.metadata,
    });

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('BidCoin earn error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

