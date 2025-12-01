import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const RecentlyCompletedSection = () => {
  const router = useRouter();
  const [completedAuctions, setCompletedAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedAuctions();
  }, []);

  const fetchCompletedAuctions = async () => {
    try {
      setLoading(true);
      
      // Fetch recently ended/completed auctions using API
      const response = await fetch('/api/auctions?status=ended&limit=6', {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch completed auctions');
      }

      const data = await response.json();
      const auctionsData = data.auctions || [];

      // Fetch bid counts and winner info for each auction
      const transformedAuctions = await Promise.all(
        auctionsData.map(async (auction) => {
          try {
            // Get bid count
            const bidsRes = await fetch(`/api/bids?auction_id=${auction.id}`);
            const bidsData = await bidsRes.json();
            const bids = bidsData.bids || [];
            const bidCount = bids.length;

            // Get winning bid (highest bid)
            const winningBid = bids.length > 0 
              ? bids.reduce((max, bid) => bid.amount > (max?.amount || 0) ? bid : max, bids[0])
              : null;

          const completedTime = new Date(auction.end_time);
          const now = new Date();
          const diffHours = Math.floor((now - completedTime) / (1000 * 60 * 60));
          const diffDays = Math.floor(diffHours / 24);
          
          let completedAt;
          if (diffDays > 0) {
            completedAt = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
          } else if (diffHours > 0) {
            completedAt = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
          } else {
            completedAt = 'Less than an hour ago';
          }

          return {
            id: auction.id,
            title: auction.title,
              finalPrice: auction.current_price || auction.starting_price || 0,
              originalEstimate: auction.starting_price || 0,
              image: auction.primary_image || auction.images?.[0]?.url || auction.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop',
              winner: winningBid?.users?.name || winningBid?.users?.email?.split('@')[0] || 'No Winner',
              seller: auction.seller_id ? 'Seller' : 'Anonymous',
            completedAt,
              completedTime: completedTime, // Store the actual date for filtering
              totalBids: bidCount,
            category: auction.category || 'General',
              soldAboveReserve: (auction.current_price || 0) >= (auction.reserve_price || auction.starting_price || 0)
          };
          } catch (error) {
            console.error(`Error processing auction ${auction.id}:`, error);
            return null;
          }
        })
      );

      // Filter out null results
      const validAuctions = transformedAuctions.filter(auction => auction !== null);
      setCompletedAuctions(validAuctions);
    } catch (error) {
      console.error('Error fetching completed auctions:', error);
      setCompletedAuctions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllCompleted = () => {
    router.push('/auction-listings?status=ended');
  };

  const handleViewAuction = (auctionId) => {
    router.push(`/auction-details/${auctionId}`);
  };

  const calculatePriceIncrease = (finalPrice, estimate) => {
    if (!estimate || estimate === 0) return 0;
    const increase = ((finalPrice - estimate) / estimate) * 100;
    return Math.round(increase);
  };

  const formatPrice = (price) => {
    // Prices are stored in dollars (DECIMAL(10,2))
    const dollars = parseFloat(price || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(dollars);
  };

  // Calculate stats - only include auctions from the last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  
  const thisWeekAuctions = completedAuctions.filter(auction => {
    if (!auction?.completedTime) return false;
    return new Date(auction.completedTime) >= sevenDaysAgo;
  });

  const totalSales = thisWeekAuctions.reduce((sum, auction) => sum + (auction?.finalPrice || 0), 0);
  const totalBids = thisWeekAuctions.reduce((sum, auction) => sum + (auction?.totalBids || 0), 0);
  const avgPriceIncrease = thisWeekAuctions.length > 0
    ? Math.round(
        thisWeekAuctions.reduce((sum, auction) => 
          sum + calculatePriceIncrease(auction?.finalPrice || 0, auction?.originalEstimate || 0), 
          0
        ) / thisWeekAuctions.length
      )
    : 0;

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 mb-12">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading completed auctions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Recently Completed Auctions</h2>
          <p className="text-muted-foreground">
            See what items have sold and their final prices
          </p>
        </div>
        
        {completedAuctions.length > 0 && (
        <Button
          variant="outline"
          onClick={handleViewAllCompleted}
          iconName="ArrowRight"
          iconPosition="right"
        >
          View All Completed
        </Button>
        )}
      </div>

      {completedAuctions.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="Gavel" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Completed Auctions Yet</h3>
          <p className="text-muted-foreground mb-4">
            Check back soon to see completed auctions and their final prices.
          </p>
        </div>
      ) : (
        <>
      {/* Completed Auctions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {completedAuctions.map((auction) => (
          <div
            key={auction?.id}
            className="bg-background border border-border rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer group"
            onClick={() => handleViewAuction(auction?.id)}
          >
            {/* Image */}
            <div className="relative h-32 overflow-hidden">
              <Image
                src={auction?.image}
                alt={auction?.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Sold Badge */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-success/90 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                SOLD
              </div>
              
              {/* Category */}
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full">
                {auction?.category}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Title */}
              <h3 className="font-semibold text-foreground text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-200">
                {auction?.title}
              </h3>

              {/* Price Information */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Final Price</span>
                  <span className="text-lg font-bold text-success">
                        {formatPrice(auction?.finalPrice || 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Starting Price</span>
                      <span className="text-sm text-muted-foreground">
                        {formatPrice(auction?.originalEstimate || 0)}
                  </span>
                </div>

                {/* Price Increase */}
                    {auction?.originalEstimate > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Price Increase</span>
                  <div className="flex items-center space-x-1">
                    <Icon name="TrendingUp" size={12} className="text-success" />
                    <span className="text-xs font-medium text-success">
                            +{calculatePriceIncrease(auction?.finalPrice || 0, auction?.originalEstimate || 0)}%
                    </span>
                  </div>
                </div>
                    )}
              </div>

              {/* Auction Stats */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center space-x-1">
                  <Icon name="Gavel" size={12} />
                      <span>{auction?.totalBids || 0} bids</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="Clock" size={12} />
                  <span>{auction?.completedAt}</span>
                </div>
              </div>

              {/* Winner & Seller Info */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Winner:</span>
                  <span className="font-medium text-foreground">{auction?.winner}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Seller:</span>
                  <span className="font-medium text-foreground">{auction?.seller}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success Stories Section */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-success">
                  {formatPrice(totalSales)}
            </div>
            <div className="text-sm text-muted-foreground">Total Sales This Week</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-primary">
                  {totalBids}
            </div>
            <div className="text-sm text-muted-foreground">Total Bids Placed</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-warning">
                  {avgPriceIncrease}%
            </div>
            <div className="text-sm text-muted-foreground">Average Price Increase</div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Call to Action */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Ready to start your own auction? List your items and reach thousands of bidders.
        </p>
        <Button
          variant="default"
          onClick={() => router.push('/auth/signup?role=seller')}
          iconName="Plus"
          iconPosition="left"
        >
          Create Your First Auction
        </Button>
      </div>
    </div>
  );
};

export default RecentlyCompletedSection;
