"use server";

import { createClient } from '@supabase/supabase-js';
import { adjustBidcoinBalance } from './bidcoinService';
import { sendEmail } from './emailService';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const REFERRAL_BONUS = 200; // 200 BidCoins = $2.00 USD
const REFERRAL_COOLDOWN_MS = 60 * 1000; // 60 seconds

export async function claimReferral(userId: string, code: string) {
  const trimmed = code?.trim().toLowerCase();
  if (!trimmed) {
    throw new Error('Referral code is required');
  }

  if (!userId) {
    throw new Error('User missing');
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, referred_by, email, name, referral_last_attempt_at')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  const now = Date.now();
  if (user.referral_last_attempt_at) {
    const lastAttempt = new Date(user.referral_last_attempt_at).getTime();
    if (!Number.isNaN(lastAttempt) && now - lastAttempt < REFERRAL_COOLDOWN_MS) {
      const secondsLeft = Math.ceil((REFERRAL_COOLDOWN_MS - (now - lastAttempt)) / 1000);
      throw new Error(`Please wait ${secondsLeft}s before trying another referral code.`);
    }
  }

  await supabaseAdmin
    .from('users')
    .update({ referral_last_attempt_at: new Date().toISOString() })
    .eq('id', userId);

  if (user.referred_by) {
    throw new Error('Referral already claimed');
  }

  const { data: referrer, error: refError } = await supabaseAdmin
    .from('users')
    .select('id, email, name, referral_code')
    .eq('referral_code', trimmed)
    .single();

  if (refError || !referrer) {
    throw new Error('Invalid referral code');
  }

  if (referrer.id === userId) {
    throw new Error('Cannot use your own referral code');
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ referred_by: referrer.id })
    .eq('id', userId);

  if (updateError) {
    throw new Error('Failed to register referral');
  }

  try {
    await adjustBidcoinBalance({
      userId: referrer.id,
      change: REFERRAL_BONUS,
      type: 'referral',
      referenceId: userId,
      referenceTable: 'users',
      metadata: { direction: 'referrer', code: trimmed },
    });

    await adjustBidcoinBalance({
      userId,
      change: REFERRAL_BONUS,
      type: 'referral',
      referenceId: referrer.id,
      referenceTable: 'users',
      metadata: { direction: 'referee', code: trimmed },
    });

    if (referrer.email) {
      const refereeName = user.name || user.email || 'A new BidWin member';
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>🎉 Your referral just joined BidWin!</h2>
          <p>Hi ${referrer.name || 'there'},</p>
          <p><strong>${refereeName}</strong> used your referral code <code>${referrer.referral_code}</code> and both of you received <strong>${REFERRAL_BONUS} BidCoins</strong>.</p>
          <p>Your current referral reward has been added to your BidCoin wallet. Share your code again to earn even more bonuses.</p>
          <p style="margin-top: 24px;">— The BidWin Team</p>
        </div>
      `;

      await sendEmail({
        to: referrer.email,
        subject: 'Your BidWin referral bonus has been credited',
        html,
        text: `${refereeName} used your BidWin referral code. ${REFERRAL_BONUS} BidCoins have been added to your wallet.`,
      });
    }
  } catch (err) {
    console.error('Referral bonus error', err);
  }

  return { success: true };
}

export async function getReferralCode(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .single();

  if (error || !data?.referral_code) {
    return null;
  }

  return data.referral_code;
}

