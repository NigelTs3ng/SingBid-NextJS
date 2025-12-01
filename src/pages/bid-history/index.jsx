"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import RoleProtectedRoute from '../../components/auth/RoleProtectedRoute';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const BidHistory = () => {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, won, lost, winning
  const [sortBy, setSortBy] = useState('newest');

  const fetchBids = async () => {
    if (!user) return;
    
    try {
      const { data: bidsData, error } = await supabase
        .from('bids')
        .select(`
          *,
          auctions (
            id,
            title,
            description,
            current_price,
            starting_price,
            end_time,
            status,
            primary_image,
            seller:users!seller_id (
              name,
              email
            ),
            images (
              image_url
            )
          )
        `)
        .eq('bidder_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enhance bids with current status
      const enhancedBids = await Promise.all(
        (bidsData || []).map(async (bid) => {
          const auction = bid.auctions;
          if (!auction) return bid;

          // Get current highest bid for this auction
          const { data: highestBid } = await supabase
            .from('bids')
            .select('amount, bidder_id')
            .eq('auction_id', auction.id)
            .order('amount', { ascending: false })
            .limit(1)
            .single();

          // Determine bid status
          let bidStatus = 'active';
          let isWinning = false;
          let result = null;
          
          if (auction.status === 'ended') {
            result = highestBid && highestBid.bidder_id === user.id ? 'won' : 'lost';
            bidStatus = 'ended';
          } else if (auction.status === 'active') {
            isWinning = highestBid && highestBid.bidder_id === user.id;
          }

          return {
            ...bid,
            auctionId: auction.id,
            auctionTitle: auction.title,
            auctionImage: auction.primary_image || auction.images?.[0]?.image_url,
            bidAmount: bid.amount,
            bidTime: bid.created_at,
            currentHighestBid: highestBid?.amount || auction.current_price,
            isWinning,
            auctionStatus: auction.status,
            auctionEndTime: auction.end_time,
            seller: auction.seller?.name || auction.seller?.email,
            result,
            bidStatus
          };
        })
      );

      setBids(enhancedBids);
    } catch (error) {
      console.error('Error fetching bids:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBids();
  };

  useEffect(() => {
    if (user) {
      fetchBids();
      // Set up real-time subscription for bid updates
      const channel = supabase
        .channel('bid_updates')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'bids',
            filter: `bidder_id=eq.${user.id}`
          },
          () => {
            fetchBids();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const getTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusBadge = (bid) => {
    if (bid.auctionStatus === 'ended') {
      if (bid.result === 'won') {
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Won</span>;
      } else {
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Lost</span>;
      }
    } else if (bid.isWinning) {
      return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Winning</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Outbid</span>;
    }
  };

  const filteredBids = bids.filter(bid => {
    switch (filter) {
      case 'active':
        return bid.auctionStatus === 'active';
      case 'winning':
        return bid.isWinning && bid.auctionStatus === 'active';
      case 'won':
        return bid.result === 'won';
      case 'lost':
        return bid.result === 'lost';
      default:
        return true;
    }
  });

  const sortedBids = filteredBids.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.bidTime) - new Date(a.bidTime);
      case 'oldest':
        return new Date(a.bidTime) - new Date(b.bidTime);
      case 'amount-high':
        return b.bidAmount - a.bidAmount;
      case 'amount-low':
        return a.bidAmount - b.bidAmount;
      case 'ending-soon':
        return new Date(a.auctionEndTime) - new Date(b.auctionEndTime);
      default:
        return 0;
    }
  });

  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard/bidder' },
    { label: 'My Bids', path: '/bid-history', isActive: true }
  ];

  return (
    <RoleProtectedRoute allowedRoles={['bidder']}>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Breadcrumb customItems={breadcrumbItems} />
          
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">My Bids</h1>
              <p className="text-muted-foreground">
                Track all your bidding activity and auction results
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                iconName={refreshing ? "Loader2" : "RefreshCw"}
                iconPosition="left"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                onClick={() => router.push('/auction-listings')}
                iconName="Search"
                iconPosition="left"
              >
                Browse Auctions
              </Button>
            </div>
          </div>

          {/* Filters and Stats */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex space-x-1">
                {[
                  { key: 'all', label: 'All Bids', count: bids.length },
                  { key: 'active', label: 'Active', count: bids.filter(b => b.auctionStatus === 'active').length },
                  { key: 'winning', label: 'Winning', count: bids.filter(b => b.isWinning && b.auctionStatus === 'active').length },
                  { key: 'won', label: 'Won', count: bids.filter(b => b.result === 'won').length },
                  { key: 'lost', label: 'Lost', count: bids.filter(b => b.result === 'lost').length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      filter === tab.key
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount-high">Highest Amount</option>
                  <option value="amount-low">Lowest Amount</option>
                  <option value="ending-soon">Ending Soon</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bids List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              <span className="ml-3 text-muted-foreground">Loading your bids...</span>
            </div>
          ) : sortedBids.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Gavel" size={24} className="text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No bids found</h3>
              <p className="text-muted-foreground mb-6">
                {filter === 'all' 
                  ? "You haven't placed any bids yet. Start browsing auctions to place your first bid!"
                  : `No bids match the "${filter}" filter. Try selecting a different filter.`
                }
              </p>
              <Button
                onClick={() => router.push('/auction-listings')}
                iconName="Search"
                iconPosition="left"
              >
                Browse Auctions
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedBids.map(bid => (
                <div key={bid.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Auction Image */}
                    <div className="w-full lg:w-24 h-48 lg:h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={bid.auctionImage || '/placeholder-auction.jpg'}
                        alt={bid.auctionTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-auction.jpg';
                        }}
                      />
                    </div>

                    {/* Bid Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
                            {bid.auctionTitle}
                          </h3>
                          <p className="text-sm text-muted-foreground">Seller: {bid.seller}</p>
                        </div>
                        {getStatusBadge(bid)}
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground block">Your Bid</span>
                          <span className="font-semibold text-foreground">${bid.bidAmount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Current High</span>
                          <span className="font-semibold text-foreground">${bid.currentHighestBid.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Bid Time</span>
                          <span className="font-semibold text-foreground">
                            {new Date(bid.bidTime).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Time Left</span>
                          <span className="font-semibold text-foreground">
                            {getTimeRemaining(bid.auctionEndTime)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/auction-details/${bid.auctionId}`)}
                      >
                        View Auction
                      </Button>
                      {bid.auctionStatus === 'active' && !bid.isWinning && (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/auction-details/${bid.auctionId}?bid=true`)}
                        >
                          Bid Again
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Stats */}
          {!loading && sortedBids.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Bidding Summary</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {bids.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Bids</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {bids.filter(b => b.result === 'won').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Auctions Won</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {bids.filter(b => b.auctionStatus === 'active' && b.isWinning).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Currently Winning</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    ${bids.reduce((sum, bid) => sum + bid.bidAmount, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Bid Value</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </RoleProtectedRoute>
  );
};

export default BidHistory;