"use server";

import { createClient } from '@supabase/supabase-js';
import {
  BIDCOIN_SIGNUP_BONUS,
  BIDCOIN_REFERRAL_BONUS,
  BIDCOIN_RAFFLE_EARN_RATE,
  BIDCOIN_AUCTION_SELLER_RATE,
  BIDCOIN_AUCTION_WINNER_RATE,
  BIDCOIN_PLAN_REWARD,
} from './bidcoinConstants';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export type BidcoinTransactionType =
  | 'signup_bonus'
  | 'referral'
  | 'auction_sale'
  | 'raffle_purchase'
  | 'item_purchase'
  | 'plan_purchase'
    | 'auction_purchase'   // ✅ add this line
  | 'adjustment';

export interface BidcoinTransactionInput {
  userId: string;
  change: number; // positive for earn, negative for spend (in cents)
  type: BidcoinTransactionType;
  referenceId?: string | null;
  referenceTable?: string | null;
  metadata?: Record<string, unknown>;
}

const buildBidcoinPayload = (input: BidcoinTransactionInput) => ({
  p_user_id: input.userId,
  p_change: input.change,
  p_type: input.type,
  p_reference_id: input.referenceId ?? null,
  p_reference_table: input.referenceTable ?? null,
  p_metadata: input.metadata ?? {},
});

export async function adjustBidcoinBalance(input: BidcoinTransactionInput) {
  const payload = buildBidcoinPayload(input);

  let { data, error } = await supabaseAdmin.rpc('bidcoin_adjust_balance_v2', payload);

  if (error?.code === 'PGRST202' || error?.message?.includes('bidcoin_adjust_balance_v2')) {
    ({ data, error } = await supabaseAdmin.rpc('bidcoin_adjust_balance', payload));
  }

  if (error) {
    throw error;
  }

  return data?.[0]?.new_balance ?? 0;
}

export async function awardBidcoins(
  userId: string,
  amountInCoins: number,
  type: BidcoinTransactionType,
  metadata?: Record<string, unknown>,
  referenceId?: string | null,
  referenceTable?: string | null
) {
  if (amountInCoins <= 0) {
    return getBidcoinBalance(userId);
  }
  return adjustBidcoinBalance({
    userId,
    change: Math.round(amountInCoins),
    type,
    metadata,
    referenceId,
    referenceTable,
  });
}

export async function spendBidcoins(
  userId: string,
  amountInCoins: number,
  type: BidcoinTransactionType,
  metadata?: Record<string, unknown>,
  referenceId?: string | null,
  referenceTable?: string | null
) {
  if (amountInCoins <= 0) {
    throw new Error('Amount must be positive');
  }

  return adjustBidcoinBalance({
    userId,
    change: -Math.round(amountInCoins),
    type,
    metadata,
    referenceId,
    referenceTable,
  });
}

export async function getBidcoinBalance(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_bidcoins')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return 0;
      }
      // table missing or other error – treat as zero but log
      console.warn('[BidcoinService] getBidcoinBalance fallback:', error);
      return 0;
    }

    const balance = data?.balance ?? 0;
    return typeof balance === 'string' ? Number(balance) : balance;
  } catch (error) {
    console.warn('[BidcoinService] getBidcoinBalance exception:', error);
    return 0;
  }
}

export async function getBidcoinTransactions(userId: string, limit = 50) {
  try {
    const { data, error } = await supabaseAdmin
      .from('bidcoin_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[BidcoinService] getBidcoinTransactions fallback:', error);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.warn('[BidcoinService] getBidcoinTransactions exception:', error);
    return [];
  }
}

