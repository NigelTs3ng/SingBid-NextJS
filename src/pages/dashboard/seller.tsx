import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { createClient } from '../../lib/supabase-browser';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';

interface SellerAuction {
  id: string;
  title: string;
  description: string;
  starting_price: number;
  current_price: number;
  end_time: string;
  status: 'active' | 'ended' | 'cancelled';
  created_at: string;
  primary_image?: string | null;
  bids?: {
    count: number;
  }[];
}

interface SellerStats {
  totalAuctions: number;
  activeAuctions: number;
  completedAuctions: number;
  totalRevenue: number;
  totalBids: number;
}

export default function SellerDashboard() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const supabase = createClient();
  const [myAuctions, setMyAuctions] = useState<SellerAuction[]>([]);
  const [stats, setStats] = useState<SellerStats>({
    totalAuctions: 0,
    activeAuctions: 0,
    completedAuctions: 0,
    totalRevenue: 0,
    totalBids: 0,
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      // If user exists, fetch data regardless of profile state
      if (user) {
        fetchDashboardData();
      }
    }
  }, [user, loading, router]);

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);

      // Fetch seller's auctions via API to include primary_image
      const res = await fetch(`/api/auctions?seller_id=${user!.id}&status=all&limit=100`)
      if (!res.ok) {
        console.error('Error fetching auctions via API')
      }
      const { auctions: auctionsData } = await res.json()
      setMyAuctions(auctionsData || [])

        // Calculate stats
        const activeCount = auctionsData?.filter(auction => auction.status === 'active').length || 0;
        const completedCount = auctionsData?.filter(auction => auction.status === 'ended').length || 0;
        const totalRevenue = auctionsData?.filter(auction => auction.status === 'ended')
          .reduce((sum, auction) => sum + auction.current_price, 0) || 0;
        const totalBids = auctionsData?.reduce((sum, auction) => {
          const bidCount = Array.isArray(auction.bids) ? auction.bids.length : 0;
          return sum + bidCount;
        }, 0) || 0;

        setStats({
          totalAuctions: auctionsData?.length || 0,
          activeAuctions: activeCount,
          completedAuctions: completedCount,
          totalRevenue,
          totalBids,
        });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'ended':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || loadingData) {
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
            Manage your auctions and track your selling performance
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Auctions</h3>
            <p className="text-2xl font-bold text-foreground">{stats.totalAuctions}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Active</h3>
            <p className="text-2xl font-bold text-success">{stats.activeAuctions}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Completed</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.completedAuctions}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Revenue</h3>
            <p className="text-2xl font-bold text-foreground">{formatPrice(stats.totalRevenue)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Bids</h3>
            <p className="text-2xl font-bold text-foreground">{stats.totalBids}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => router.push('/create-auction')}
              className="flex-shrink-0"
            >
              Create New Auction
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/seller/analytics')}
              className="flex-shrink-0"
            >
              View Analytics
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/seller/stripe-connect')}
              className="flex-shrink-0"
            >
              Connect Bank Account
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/payment-dashboard')}
              className="flex-shrink-0"
            >
              Payment Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/subscription-management')}
              className="flex-shrink-0"
            >
              Manage Subscription
            </Button>
          </div>
        </div>

        {/* Recent Performance */}
        {stats.completedAuctions > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Recent Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Success Rate</h3>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round((stats.completedAuctions / stats.totalAuctions) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.completedAuctions} of {stats.totalAuctions} auctions completed
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Avg. Revenue</h3>
                <p className="text-2xl font-bold text-foreground">
                  {stats.completedAuctions > 0 
                    ? formatPrice(stats.totalRevenue / stats.completedAuctions)
                    : formatPrice(0)
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Per completed auction
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Avg. Bids</h3>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalAuctions > 0 
                    ? Math.round(stats.totalBids / stats.totalAuctions)
                    : 0
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Per auction
                </p>
              </div>
            </div>
          </div>
        )}

        {/* My Auctions */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">My Auctions</h2>
            <Button
              onClick={() => router.push('/create-auction')}
              size="sm"
            >
              Create New
            </Button>
          </div>
          
          {myAuctions.length > 0 ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="divide-y divide-border">
                {myAuctions.slice(0, 10).map((auction) => (
                  <div key={auction.id} className="p-6 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      {auction.primary_image && (
                        <div className="w-28 h-20 mr-4 flex-shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                          <img src={auction.primary_image} alt={auction.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 pr-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-foreground text-lg line-clamp-1">
                            {auction.title}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ml-2 ${getStatusColor(auction.status)}`}>
                            {auction.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {auction.description}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Starting Price</p>
                            <p className="font-medium text-sm">{formatPrice(auction.starting_price)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Current Price</p>
                            <p className="font-medium text-sm text-success">{formatPrice(auction.current_price)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Bids</p>
                            <p className="font-medium text-sm">
                              {Array.isArray(auction.bids) ? auction.bids.length : 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {auction.status === 'active' ? 'Time Left' : 'Ended'}
                            </p>
                            <p className="font-medium text-sm">
                              {auction.status === 'active' 
                                ? formatTimeRemaining(auction.end_time)
                                : new Date(auction.end_time).toLocaleDateString()
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/auction-details/${auction.id}`)}
                          >
                            View Details
                          </Button>
                          {auction.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/auction-details/${auction.id}/edit`)}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/auction-details/${auction.id}/analytics`)}
                          >
                            Analytics
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-medium text-foreground mb-2">No auctions yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start selling by creating your first auction. It's easy and only takes a few minutes.
                </p>
                <Button onClick={() => router.push('/create-auction')}>
                  Create Your First Auction
                </Button>
              </div>
            </div>
          )}
          
          {myAuctions.length > 10 && (
            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={() => router.push('/seller/auctions')}
              >
                View All Auctions ({myAuctions.length})
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}