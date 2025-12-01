"use client";

import { useState } from 'react';
import Button from './ui/Button';
import Icon from './AppIcon';
import { useReferralInfo } from '../hooks/useReferralInfo';
import { cn } from '../utils/cn';

interface ReferralCardProps {
  className?: string;
}

export default function ReferralCard({ className = '' }: ReferralCardProps) {
  const { data, loading, error, shareUrl, refresh } = useReferralInfo();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!data.referralCode) return;
    try {
      await navigator.clipboard.writeText(data.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.warn('Failed to copy referral code', copyError);
    }
  };

  const handleShareLinkCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.warn('Failed to copy referral link', copyError);
    }
  };

  const totalUsd = data.totalCoinsEarned / 100;

  return (
    <div className={cn('bg-card border border-border rounded-lg p-6 flex flex-col gap-6', className)}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Refer &amp; Earn</p>
          <h3 className="text-2xl font-bold text-foreground">Share your BidWin code</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Earn 200 BidCoins every time someone signs up with your code—and they’ll get 200 too.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="bg-muted rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="font-mono text-lg tracking-wider">
              {loading ? '••••••••' : data.referralCode ?? 'Unavailable'}
            </span>
            <button
              className="ml-3 inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
              onClick={handleCopy}
              disabled={!data.referralCode}
            >
              <Icon name={copied ? 'Check' : 'Copy'} size={18} />
              <span className="text-sm">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleShareLinkCopy} disabled={!shareUrl}>
            Copy Share Link
          </Button>
        </div>
      </div>

      {shareUrl && (
        <div className="bg-muted/60 border border-border rounded-md px-4 py-3 text-sm text-muted-foreground break-all">
          <span className="font-medium text-foreground mr-2">Referral Link:</span>
          {shareUrl}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted/50 rounded-md p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Referrals</p>
          <p className="text-3xl font-bold text-foreground mt-1">{data.referralCount}</p>
        </div>
        <div className="bg-muted/50 rounded-md p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Coins Earned</p>
          <p className="text-3xl font-bold text-foreground mt-1">{data.totalCoinsEarned}</p>
        </div>
        <div className="bg-muted/50 rounded-md p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Value (USD)</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalUsd)}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground">Referral history</h4>
          <div className="flex items-center gap-2">
            {error && <span className="text-xs text-red-500">{error}</span>}
            <Button variant="ghost" size="sm" onClick={() => refresh()} disabled={loading}>
              <Icon name="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
              <span className="ml-1 text-xs">Refresh</span>
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-12 bg-muted animate-pulse rounded" />
            <div className="h-12 bg-muted animate-pulse rounded" />
          </div>
        ) : data.referrals.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4 text-center">
            No referrals yet. Share your code to start earning BidCoins.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Joined</th>
                  <th className="py-2 pr-4 font-medium text-right">Coins</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((ref) => (
                  <tr key={ref.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-4 font-medium text-foreground">{ref.name || 'New member'}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{ref.email || '—'}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {new Date(ref.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4 text-right text-foreground">
                      {ref.coins_awarded || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


