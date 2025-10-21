import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
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
      // Fetch recently ended auctions
      const { data: auctionsData, error } = await supabase
        .from('auctions')
        .select(`
          *,
          seller:users!seller_id (
            name,
            email
          ),
          images (
            image_url
          ),
          bid_count:bids(count),
          winner_bid:bids!bids_auction_id_fkey(
            bidder:users!bidder_id(
              name,
              email
            )
          )
        `)
        .eq('status', 'ended')
        .order('end_time', { ascending: false })
        .limit(6);

      if (error) throw error;

      // Transform data and get winner information
      const transformedAuctions = await Promise.all(
        (auctionsData || []).map(async (auction) => {
          // Get the winning bid (highest bid for this auction)
          const { data: winningBid } = await supabase
            .from('bids')
            .select(`
              amount,
              bidder:users!bidder_id(
                name,
                email
              )
            `)
            .eq('auction_id', auction.id)
            .order('amount', { ascending: false })
            .limit(1)
            .single();

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
            finalPrice: auction.current_price,
            originalEstimate: auction.starting_price,
            image: auction.primary_image || auction.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop',
            winner: winningBid?.bidder?.name || winningBid?.bidder?.email?.split('@')[0] || 'Anonymous',
            seller: auction.seller?.name || auction.seller?.email?.split('@')[0] || 'Anonymous',
            completedAt,
            totalBids: auction.bid_count?.[0]?.count || 0,
            category: auction.category || 'General',
            soldAboveReserve: auction.current_price >= (auction.reserve_price || auction.starting_price)
          };
        })
      );

      setCompletedAuctions(transformedAuctions);
    } catch (error) {
      console.error('Error fetching completed auctions:', error);
      // Set empty array on error to avoid breaking the component
      setCompletedAuctions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllCompleted = () => {
    router.push('/auction-listings?status=completed');
  };

  const handleViewAuction = (auctionId) => {
    router.push(`/auction-details/${auctionId}?status=completed`);
  };

  const calculatePriceIncrease = (finalPrice, estimate) => {
    const increase = ((finalPrice - estimate) / estimate) * 100;
    return Math.round(increase);
  };

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
        
        <Button
          variant="outline"
          onClick={handleViewAllCompleted}
          iconName="ArrowRight"
          iconPosition="right"
        >
          View All Completed
        </Button>
      </div>
      {/* Completed Auctions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {completedAuctions?.map((auction) => (
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
                    S${auction?.finalPrice?.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Original Estimate</span>
                  <span className="text-sm text-muted-foreground line-through">
                    S${auction?.originalEstimate?.toLocaleString()}
                  </span>
                </div>

                {/* Price Increase */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Price Increase</span>
                  <div className="flex items-center space-x-1">
                    <Icon name="TrendingUp" size={12} className="text-success" />
                    <span className="text-xs font-medium text-success">
                      +{calculatePriceIncrease(auction?.finalPrice, auction?.originalEstimate)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Auction Stats */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center space-x-1">
                  <Icon name="Gavel" size={12} />
                  <span>{auction?.totalBids} bids</span>
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
              S${completedAuctions?.reduce((sum, auction) => sum + auction?.finalPrice, 0)?.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Sales This Week</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-primary">
              {completedAuctions?.reduce((sum, auction) => sum + auction?.totalBids, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Bids Placed</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-warning">
              {Math.round(completedAuctions?.reduce((sum, auction) => 
                sum + calculatePriceIncrease(auction?.finalPrice, auction?.originalEstimate), 0
              ) / completedAuctions?.length)}%
            </div>
            <div className="text-sm text-muted-foreground">Average Price Increase</div>
          </div>
        </div>
      </div>
      {/* Call to Action */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Ready to start your own auction? List your items and reach thousands of bidders.
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
    </div>
  );
};

export default RecentlyCompletedSection;