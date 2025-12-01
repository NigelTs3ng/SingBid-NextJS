import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import AuctionCard from './AuctionCard';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ActiveAuctionsGrid = ({ filters }) => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(12);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      
      // Fetch active auctions from database
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
          bid_count:bids(count)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match component structure
      const transformedAuctions = auctionsData?.map(auction => {
        const endTime = new Date(auction.end_time);
        const now = new Date();
        const diff = endTime - now;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return {
          id: auction.id,
          title: auction.title,
          description: auction.description,
          currentBid: auction.current_price,
          reservePrice: auction.reserve_price || auction.starting_price,
          timeRemaining: { 
            hours: Math.max(0, hours), 
            minutes: Math.max(0, minutes), 
            seconds: Math.max(0, seconds) 
          },
          image: auction.primary_image || auction.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',
          seller: {
            name: auction.seller?.name || auction.seller?.email?.split('@')[0] || 'Anonymous',
            rating: 4.5, // Default rating
            verified: true // Default to verified
          },
          totalBids: auction.bid_count?.[0]?.count || 0,
          category: auction.category || 'General',
          views: Math.floor(Math.random() * 500) + 50, // Random views for now
          shippingIncluded: Math.random() > 0.5, // Random shipping
          featured: auction.current_price > 1000 // Featured if high value
        };
      }) || [];

      return transformedAuctions;
    } catch (error) {
      console.error('Error fetching auctions:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadAuctions = async () => {
      const fetchedAuctions = await fetchAuctions();
      let filteredAuctions = [...fetchedAuctions];

      // Apply category filter
      if (filters?.category !== 'all') {
        filteredAuctions = filteredAuctions?.filter(auction => 
          auction?.category?.toLowerCase()?.includes(filters?.category?.toLowerCase())
        );
      }

      // Apply price range filter
      if (filters?.priceRange !== 'all') {
        const [min, max] = filters?.priceRange?.split('-')?.map(p => 
          p?.includes('+') ? Infinity : parseInt(p)
        );
        filteredAuctions = filteredAuctions?.filter(auction => {
          if (max === undefined) return auction?.currentBid >= min;
          return auction?.currentBid >= min && auction?.currentBid <= max;
        });
      }

      // Apply time remaining filter
      if (filters?.timeRemaining !== 'all') {
        filteredAuctions = filteredAuctions?.filter(auction => {
          const totalHours = auction?.timeRemaining?.hours + (auction?.timeRemaining?.minutes / 60);
          switch (filters?.timeRemaining) {
            case '1h': return totalHours <= 1;
            case '6h': return totalHours <= 6;
            case '24h': return totalHours <= 24;
            case '7d': return totalHours <= 168;
            default: return true;
          }
        });
      }

      // Apply sorting
      switch (filters?.sortBy) {
        case 'ending_soon':
          filteredAuctions?.sort((a, b) => {
            const aTotal = a?.timeRemaining?.hours * 3600 + a?.timeRemaining?.minutes * 60 + a?.timeRemaining?.seconds;
            const bTotal = b?.timeRemaining?.hours * 3600 + b?.timeRemaining?.minutes * 60 + b?.timeRemaining?.seconds;
            return aTotal - bTotal;
          });
          break;
        case 'highest_bid':
          filteredAuctions?.sort((a, b) => b?.currentBid - a?.currentBid);
          break;
        case 'lowest_bid':
          filteredAuctions?.sort((a, b) => a?.currentBid - b?.currentBid);
          break;
        case 'most_bids':
          filteredAuctions?.sort((a, b) => b?.totalBids - a?.totalBids);
          break;
        case 'newest':
          filteredAuctions?.sort((a, b) => b?.id - a?.id);
          break;
        case 'alphabetical':
          filteredAuctions?.sort((a, b) => a?.title?.localeCompare(b?.title));
          break;
        default:
          break;
      }

      setAuctions(filteredAuctions);
    };
    
    loadAuctions();
  }, [filters]);

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 12);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 })?.map((_, index) => (
          <div key={index} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
            <div className="h-48 bg-muted"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-muted rounded flex-1"></div>
                <div className="h-8 w-8 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (auctions?.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="Search" size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No auctions found</h3>
        <p className="text-muted-foreground mb-6">
          Try adjusting your filters or check back later for new auctions.
        </p>
        <Button
          variant="outline"
          onClick={() => window.location?.reload()}
          iconName="RotateCcw"
          iconPosition="left"
        >
          Reset Filters
        </Button>
      </div>
    );
  }

  const displayedAuctions = auctions?.slice(0, displayCount);
  const hasMore = displayCount < auctions?.length;

  return (
    <div className="space-y-8">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Active Auctions</h2>
          <p className="text-muted-foreground">
            Showing {displayedAuctions?.length} of {auctions?.length} auctions
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span>Live bidding active</span>
        </div>
      </div>
      {/* Auctions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedAuctions?.map((auction) => (
          <AuctionCard key={auction?.id} auction={auction} />
        ))}
      </div>
      {/* Load More Button */}
      {hasMore && (
        <div className="text-center pt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLoadMore}
            iconName="ChevronDown"
            iconPosition="right"
          >
            Load More Auctions ({auctions?.length - displayCount} remaining)
          </Button>
        </div>
      )}
      {/* Bottom Stats */}
      <div className="bg-muted/30 rounded-xl p-6 text-center">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="text-2xl font-bold text-primary">{auctions?.length}</div>
            <div className="text-sm text-muted-foreground">Active Auctions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-success">
              {auctions?.filter(a => a?.timeRemaining?.hours < 1)?.length}
            </div>
            <div className="text-sm text-muted-foreground">Ending Soon</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-warning">
              {auctions?.filter(a => a?.featured)?.length}
            </div>
            <div className="text-sm text-muted-foreground">Featured Items</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveAuctionsGrid;