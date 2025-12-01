import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import BidcoinSummaryCard from '../../components/BidcoinSummaryCard';
import ReferralCard from '../../components/ReferralCard';
import AuctionCard from '../../components/pages/auction-listings/AuctionCard';

interface Auction {
  id: string;
  title: string;
  description: string;
  starting_price: number;
  current_price: number;
  end_time: string;
  status: 'active' | 'ended' | 'cancelled';
  primary_image?: string | null;
}

interface Bid {
  id: string;
  auction_id: string;
  amount: number;
  status: 'active' | 'cancelled' | 'winning' | 'outbid';
  authorization_status: 'authorized' | 'captured' | 'cancelled';
  stripe_payment_intent_id?: string;
  payment_method?: 'card' | 'bidcoin' | 'hybrid';
  bidcoin_hold?: number;
  created_at: string;
  auctions: {
    title: string;
    status: string;
    end_time: string;
  };
}

export default function BidderDashboard() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.push('/auth/login');
      return;
    }

    const currentUserId = user.id;
    const isNewUser = lastUserIdRef.current !== currentUserId;

    if (!hasLoadedOnce || isNewUser) {
      fetchDashboardData(true).catch((error) =>
        console.error('Bidder dashboard initial load failed', error)
      );
      lastUserIdRef.current = currentUserId;
    }
  }, [user?.id, loading, hasLoadedOnce, router]);
  
  // Refresh when user focuses on the page (coming back from auction)
  const fetchDashboardData = async (showInitialLoader: boolean = false) => {
    if (!user) {
      return;
    }

    const shouldShowInitialLoader = !hasLoadedOnce || showInitialLoader;

    try {
      if (shouldShowInitialLoader) {
        setLoadingData(true);
      }
      console.log('Fetching dashboard data for user:', user?.id);

      // Fetch active auctions using API for consistent data formatting
      try {
        const auctionResponse = await fetch('/api/auctions?status=active&limit=6');
        if (auctionResponse.ok) {
          const { auctions: auctionsData } = await auctionResponse.json();
          setActiveAuctions(auctionsData || []);
        } else {
          console.error('Error fetching auctions from API');
        }
      } catch (error) {
        console.error('Error fetching auctions:', error);
      }

      // Fetch user's bids using API
      try {
        const bidsResponse = await fetch(`/api/bids?user_id=${user!.id}`);
        console.log('Bids API response status:', bidsResponse.status);
        if (bidsResponse.ok) {
          const { bids: bidsData } = await bidsResponse.json();
          console.log('Fetched bids data:', bidsData);
          setMyBids(bidsData || []);
        } else {
          const errorText = await bidsResponse.text();
          console.error('Error fetching user bids from API:', errorText);
        }
      } catch (error) {
        console.error('Error fetching user bids:', error);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (shouldShowInitialLoader) {
        setLoadingData(false);
        setHasLoadedOnce(true);
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getPaymentStatusInfo = (bid: Bid) => {
    const { status, authorization_status, payment_method, bidcoin_hold } = bid as any;
    
    if (payment_method === 'bidcoin') {
      if (status === 'winning' && authorization_status === 'captured') {
        return {
          color: 'bg-green-100 text-green-800',
          text: `🎉 Won - Paid with BidCoins`,
          description: 'Your BidCoins have been spent for this auction.'
        };
      }
      if (status === 'active') {
        return {
          color: 'bg-yellow-100 text-yellow-800',
          text: `🪙 BidCoins Held (${bidcoin_hold || 0})`,
          description: 'BidCoins reserved for this bid. They will be released if you are outbid.'
        };
      }
      if (status === 'outbid') {
        return {
          color: 'bg-gray-100 text-gray-800',
          text: `💸 BidCoins Released`,
          description: 'You were outbid. Your BidCoins have been returned.'
        };
      }
    }
    
    if (status === 'winning' && authorization_status === 'captured') {
      return {
        color: 'bg-green-100 text-green-800',
        text: '🎉 WON - Paid',
        description: 'You won this auction! Payment has been charged.'
      };
    }
    
    if (status === 'active' && authorization_status === 'authorized') {
      return {
        color: 'bg-blue-100 text-blue-800',
        text: '💳 Active - Held',
        description: 'Your bid is active. Payment is authorized and held.'
      };
    }
    
    if (status === 'outbid' && authorization_status === 'cancelled') {
      return {
        color: 'bg-gray-100 text-gray-800',
        text: '💸 Outbid - Refunded',
        description: 'You were outbid. Payment authorization has been released.'
      };
    }
    
    if (status === 'cancelled') {
      return {
        color: 'bg-red-100 text-red-800',
        text: '❌ Cancelled',
        description: 'Auction was cancelled. Full refund processed.'
      };
    }

    return {
      color: 'bg-yellow-100 text-yellow-800',
      text: '⏳ Processing',
      description: 'Bid is being processed...'
    };
  };

  if (loading || (loadingData && !hasLoadedOnce)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Loading Dashboard...</h1>
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 lg:px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {userProfile?.name}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening in your bidding world
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
          <BidcoinSummaryCard className="md:col-span-2 lg:col-span-2" />
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Bids</h3>
            <p className="text-2xl font-bold text-blue-600">
              {myBids.filter(bid => bid.status === 'active').length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Funds held</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Won Auctions</h3>
            <p className="text-2xl font-bold text-green-600">
              {myBids.filter(bid => bid.status === 'winning' && bid.authorization_status === 'captured').length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Payment captured</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Outbid</h3>
            <p className="text-2xl font-bold text-gray-600">
              {myBids.filter(bid => bid.status === 'outbid').length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Funds released</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Bids</h3>
            <p className="text-2xl font-bold text-foreground">{myBids.length}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </div>
        </div>

        {/* Referral */}
        <div className="mb-8">
          <ReferralCard />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => router.push('/auction-listings')}
              className="flex-shrink-0"
            >
              Browse All Auctions
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/bid-history')}
              className="flex-shrink-0"
            >
              Bid History
            </Button>
          </div>
        </div>

        {/* Active Auctions */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">Active Auctions</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/auction-listings')}
            >
              View All
            </Button>
          </div>
          {activeAuctions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  viewMode="grid"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground mb-4">No active auctions at the moment</p>
              <Button onClick={() => router.push('/auction-listings')}>
                Browse Auctions
              </Button>
            </div>
          )}
        </div>

        {/* Recent Bids */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Bids</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('Manual refresh triggered');
                  fetchDashboardData();
                }}
                className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
              >
                🔄 Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/bid-history')}
              >
                View All
              </Button>
            </div>
          </div>
          {myBids.length > 0 ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="divide-y divide-border">
                {myBids.map((bid) => {
                  const paymentInfo = getPaymentStatusInfo(bid);
                  return (
                    <div key={bid.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground mb-1">
                            {bid.auctions?.title || 'Unknown Auction'}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Bid placed on {new Date(bid.created_at).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-4 mb-2">
                            <span className="text-sm">
                              <span className="text-muted-foreground">Amount:</span>{' '}
                              <span className="font-medium">{formatPrice(bid.amount)}</span>
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${paymentInfo.color}`}>
                              {paymentInfo.text}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {paymentInfo.description}
                          </p>
                          {bid.stripe_payment_intent_id && (
                            <div className="mt-2 text-xs font-mono bg-black text-white px-2 py-1 rounded inline-block">
                              TEST: {bid.stripe_payment_intent_id.substring(0, 20)}...
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">
                            Ends: {bid.auctions?.end_time ? formatTimeRemaining(bid.auctions.end_time) : 'Unknown'}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            bid.auctions?.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : bid.auctions?.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {bid.auctions?.status || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground mb-4">You haven't placed any bids yet</p>
              <Button onClick={() => router.push('/auction-listings')}>
                Start Bidding
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}