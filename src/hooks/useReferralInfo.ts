import { useCallback, useEffect, useMemo, useState } from 'react';

interface ReferralHistoryEntry {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  coins_awarded: number;
}

interface ReferralInfoState {
  referralCode: string | null;
  referrals: ReferralHistoryEntry[];
  totalCoinsEarned: number;
  referralCount: number;
}

export function useReferralInfo() {
  const [data, setData] = useState<ReferralInfoState>({
    referralCode: null,
    referrals: [],
    totalCoinsEarned: 0,
    referralCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [codeRes, historyRes] = await Promise.all([
        fetch('/api/referrals/me', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/referrals/history', { credentials: 'include', cache: 'no-store' }),
      ]);

      if (codeRes.status === 401 || historyRes.status === 401) {
        setData({
          referralCode: null,
          referrals: [],
          totalCoinsEarned: 0,
          referralCount: 0,
        });
        return;
      }

      if (!codeRes.ok) {
        throw new Error(await codeRes.text());
      }

      if (!historyRes.ok) {
        throw new Error(await historyRes.text());
      }

      const codePayload = await codeRes.json();
      const historyPayload = await historyRes.json();

      setData({
        referralCode: codePayload?.referralCode ?? null,
        referrals: historyPayload?.referrals ?? [],
        totalCoinsEarned: historyPayload?.totals?.coinsEarned ?? 0,
        referralCount: historyPayload?.totals?.referralCount ?? 0,
      });
    } catch (err) {
      console.error('Failed to load referral info', err);
      setError('Unable to load referral information right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData().catch(() => {});
  }, [fetchData]);

  const shareUrl = useMemo(() => {
    if (!data.referralCode) {
      return null;
    }
    if (typeof window === 'undefined') {
      return null;
    }
    const origin = window.location.origin;
    return `${origin}/auth/signup?ref=${encodeURIComponent(data.referralCode)}`;
  }, [data.referralCode]);

  return {
    data,
    loading,
    error,
    shareUrl,
    refresh: fetchData,
  };
}


