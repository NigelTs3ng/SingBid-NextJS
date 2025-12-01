"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import BidcoinSummaryCard from '../../components/BidcoinSummaryCard';
import Image from '../../components/AppImage';

interface SellerAuction {
  id: string;
  title: string;
  current_price: number;
  starting_price: number;
  end_time: string;
  status: string;
  primary_image?: string | null;
  bids_count?: number;
}

interface SellerStats {
  activeAuctions: number;
  totalAuctions: number;
  totalRevenue: number;
  completedAuctions: number;
  totalBids: number;
}

export default function SellerHomePage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<SellerStats>({
    activeAuctions: 0,
    totalAuctions: 0,
    totalRevenue: 0,
    completedAuctions: 0,
    totalBids: 0,
  });
  const [activeAuctions, setActiveAuctions] = useState<SellerAuction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (userProfile?.user_role !== 'seller') {
      router.push('/dashboard/bidder');
      return;
    }

    fetchSellerData();
  }, [user, userProfile, authLoading, router]);

  const fetchSellerData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch seller's auctions
      const auctionsRes = await fetch(`/api/auctions?seller_id=${user.id}&status=all&limit=50`);
      const auctionsData = await auctionsRes.json();
      const allAuctions = auctionsData.auctions || [];

      // Calculate stats
      const active = allAuctions.filter((a: SellerAuction) => a.status === 'active');
      const completed = allAuctions.filter((a: SellerAuction) => a.status === 'ended' || a.status === 'completed');
      
      // Calculate revenue from completed auctions
      const revenue = completed.reduce((sum: number, auction: SellerAuction) => {
        return sum + (auction.current_price || 0);
      }, 0);

      // Get bid counts for active auctions
      const auctionsWithBids = await Promise.all(
        active.map(async (auction: SellerAuction) => {
          try {
            const bidsRes = await fetch(`/api/bids?auction_id=${auction.id}`);
            const bidsData = await bidsRes.json();
            return {
              ...auction,
              bids_count: bidsData.bids?.length || 0
            };
          } catch {
            return { ...auction, bids_count: 0 };
          }
        })
      );

      setStats({
        activeAuctions: active.length,
        totalAuctions: allAuctions.length,
        totalRevenue: revenue,
        completedAuctions: completed.length,
        totalBids: allAuctions.reduce((sum: number, a: SellerAuction) => sum + (a.bids_count || 0), 0),
      });

      setActiveAuctions(auctionsWithBids.slice(0, 6)); // Show top 6 active auctions
    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = Math.max(0, end.getTime() - now.getTime());
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your seller homepage...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Seller Home - BidWin</title>
        <meta name="description" content="Manage your auctions and grow your business on BidWin" />
      </Head>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 lg:px-6 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Welcome back, {userProfile?.name || user?.email?.split('@')[0] || 'Seller'}!
            </h1>
            <p className="text-muted-foreground">
              Manage your auctions, track your sales, and grow your business on BidWin.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon name="Gavel" size={20} className="text-primary" />
                <span className="text-2xl font-bold text-foreground">{stats.activeAuctions}</span>
              </div>
              <p className="text-sm text-muted-foreground">Active Auctions</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon name="CheckCircle" size={20} className="text-success" />
                <span className="text-2xl font-bold text-foreground">{stats.completedAuctions}</span>
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon name="DollarSign" size={20} className="text-warning" />
                <span className="text-2xl font-bold text-foreground">
                  ${stats.totalRevenue.toFixed(0)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon name="TrendingUp" size={20} className="text-error" />
                <span className="text-2xl font-bold text-foreground">{stats.totalBids}</span>
              </div>
              <p className="text-sm text-muted-foreground">Total Bids</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Button
                  variant="default"
                  fullWidth
                  onClick={() => router.push('/create-auction')}
                  iconName="Plus"
                  iconPosition="left"
                  className="justify-start"
                >
                  Create New Auction
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => router.push('/dashboard/seller')}
                  iconName="LayoutDashboard"
                  iconPosition="left"
                  className="justify-start"
                >
                  View Dashboard
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => router.push('/seller/analytics')}
                  iconName="BarChart"
                  iconPosition="left"
                  className="justify-start"
                >
                  View Analytics
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => router.push('/seller/payouts')}
                  iconName="CreditCard"
                  iconPosition="left"
                  className="justify-start"
                >
                  Manage Payouts
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Your BidCoins</h2>
              <BidcoinSummaryCard />
            </div>
          </div>

          {/* Active Auctions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground">Your Active Auctions</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/seller')}
                iconName="ArrowRight"
                iconPosition="right"
              >
                View All
              </Button>
            </div>

            {activeAuctions.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <Icon name="Gavel" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Active Auctions</h3>
                <p className="text-muted-foreground mb-4">
                  Start selling by creating your first auction!
                </p>
                <Button
                  variant="default"
                  onClick={() => router.push('/create-auction')}
                  iconName="Plus"
                  iconPosition="left"
                >
                  Create Your First Auction
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAuctions.map((auction) => (
                  <div
                    key={auction.id}
                    className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/auction-details/${auction.id}`)}
                  >
                    <div className="aspect-video bg-muted relative">
                      <Image
                        src={auction.primary_image || '/placeholder-auction.jpg'}
                        alt={auction.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                        {auction.title}
                      </h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Current Bid</span>
                        <span className="text-lg font-bold text-primary">
                          ${(auction.current_price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">
                          <Icon name="Users" size={14} className="inline mr-1" />
                          {auction.bids_count || 0} bids
                        </span>
                        <span className="text-muted-foreground">
                          <Icon name="Clock" size={14} className="inline mr-1" />
                          {formatTimeRemaining(auction.end_time)}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/auction-details/${auction.id}`);
                        }}
                        className="mt-2"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-8 md:p-12 text-center text-white mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Grow Your Sales?</h2>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              Create new auctions, track your performance, and maximize your earnings. Start selling more today!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/create-auction')}
                iconName="Plus"
                iconPosition="left"
                className="bg-white text-primary hover:bg-gray-100 px-8 py-3"
              >
                Create New Auction
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/dashboard/seller')}
                iconName="LayoutDashboard"
                iconPosition="left"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 px-8 py-3"
              >
                View Dashboard
              </Button>
            </div>
          </div>

          {/* Tips & Resources */}
          <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 border border-primary/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
              <Icon name="Lightbulb" size={20} className="mr-2 text-primary" />
              Seller Tips
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Icon name="CheckCircle" size={20} className="text-success mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-1">High-Quality Images</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload clear, well-lit photos from multiple angles to attract more bidders.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon name="CheckCircle" size={20} className="text-success mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-1">Detailed Descriptions</h3>
                  <p className="text-sm text-muted-foreground">
                    Provide comprehensive item descriptions to build buyer confidence.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon name="CheckCircle" size={20} className="text-success mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-1">Set Competitive Prices</h3>
                  <p className="text-sm text-muted-foreground">
                    Research similar items to set attractive starting and reserve prices.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon name="CheckCircle" size={20} className="text-success mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-1">Promote Your Auctions</h3>
                  <p className="text-sm text-muted-foreground">
                    Share your auction links on social media to reach more potential buyers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

