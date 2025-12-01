"use client";

import React from 'react';
import Icon from './AppIcon';
import { useBidcoins } from '../hooks/useBidcoins';

interface BidcoinSummaryCardProps {
  className?: string;
}

const BidcoinSummaryCard: React.FC<BidcoinSummaryCardProps> = ({ className = '' }) => {
  const { data, loading, error } = useBidcoins();

  console.debug('[BidcoinSummaryCard] data', data, 'loading', loading, 'error', error);

  const balanceRaw =
    typeof data?.balance === 'string' ? Number(data?.balance) : data?.balance ?? 0;
  const computedBalance =
    data?.transactions?.reduce((total: number, tx: any) => {
      const change =
        typeof tx?.change === 'string' ? Number(tx?.change ?? 0) : tx?.change ?? 0;
      return total + Number(change);
    }, 0) ?? 0;
  const balance = balanceRaw === 0 && computedBalance !== 0 ? computedBalance : balanceRaw;
  const usdValue = balance / 100;
  const formattedBalance = new Intl.NumberFormat('en-US').format(balance);
  const formattedUsd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(usdValue);

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">BidCoin Balance</p>
          {loading ? (
            <div className="space-y-2">
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              <div className="h-4 w-40 bg-muted animate-pulse rounded" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-foreground">
                {formattedBalance} <span className="text-base font-medium text-muted-foreground">BidCoins</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ≈ {formattedUsd} USD
              </p>
            </>
          )}
        </div>
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <Icon name="Coins" size={24} />
        </div>
      </div>
      <div className="mt-4 text-sm text-muted-foreground border-t border-border pt-4">
        <p>1 BidCoin = $0.01 USD.</p>
        <p className="mt-1">
          Use BidCoins to pay for raffle tickets, auctions, or premium plans.
        </p>
      </div>
    </div>
  );
};

export default BidcoinSummaryCard;

