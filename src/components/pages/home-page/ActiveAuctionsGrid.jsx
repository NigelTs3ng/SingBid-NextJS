import React, { useState, useEffect } from 'react';
import AuctionCard from './AuctionCard';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ActiveAuctionsGrid = ({ filters }) => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(12);

  // Mock auction data
  const mockAuctions = [
    {
      id: 1,
      title: "iPhone 15 Pro Max 256GB Natural Titanium",
      description: "Brand new sealed iPhone 15 Pro Max with 1 year Apple warranty",
      currentBid: 1450,
      reservePrice: 1200,
      timeRemaining: { hours: 3, minutes: 24, seconds: 15 },
      image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop",
      seller: {
        name: "TechStore_SG",
        rating: 4.8,
        verified: true
      },
      totalBids: 34,
      category: "Electronics",
      views: 156,
      shippingIncluded: true,
      featured: true
    },
    {
      id: 2,
      title: "Vintage Omega Speedmaster Professional",
      description: "Classic Omega Speedmaster with original box and papers",
      currentBid: 2800,
      reservePrice: 2500,
      timeRemaining: { hours: 1, minutes: 45, seconds: 30 },
      image: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=400&h=300&fit=crop",
      seller: {
        name: "WatchExpert_SG",
        rating: 4.9,
        verified: true
      },
      totalBids: 67,
      category: "Watches & Jewelry",
      views: 289,
      shippingIncluded: false
    },
    {
      id: 3,
      title: "Singapore Merlion Limited Edition Print",
      description: "Exclusive artwork by local artist, numbered edition",
      currentBid: 320,
      reservePrice: 250,
      timeRemaining: { hours: 12, minutes: 30, seconds: 45 },
      image: "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=400&h=300&fit=crop",
      seller: {
        name: "ArtCollector_Marina",
        rating: 4.7,
        verified: true
      },
      totalBids: 18,
      category: "Art & Collectibles",
      views: 94,
      shippingIncluded: true
    },
    {
      id: 4,
      title: "MacBook Air M2 13-inch Space Gray",
      description: "Lightly used MacBook Air with original charger and box",
      currentBid: 1180,
      reservePrice: 1000,
      timeRemaining: { hours: 6, minutes: 15, seconds: 20 },
      image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=300&fit=crop",
      seller: {
        name: "StudentSeller_NUS",
        rating: 4.6,
        verified: false
      },
      totalBids: 42,
      category: "Electronics",
      views: 203,
      shippingIncluded: true
    },
    {
      id: 5,
      title: "Hermès Birkin 30 Togo Leather Black",
      description: "Authentic Hermès Birkin bag with dust bag and receipt",
      currentBid: 8500,
      reservePrice: 7000,
      timeRemaining: { hours: 2, minutes: 8, seconds: 55 },
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=300&fit=crop",
      seller: {
        name: "LuxuryBags_Orchard",
        rating: 4.9,
        verified: true
      },
      totalBids: 89,
      category: "Fashion & Accessories",
      views: 445,
      shippingIncluded: false,
      featured: true
    },
    {
      id: 6,
      title: "Sony PlayStation 5 Console Bundle",
      description: "PS5 console with extra controller and 3 games",
      currentBid: 680,
      reservePrice: 600,
      timeRemaining: { hours: 8, minutes: 42, seconds: 10 },
      image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=300&fit=crop",
      seller: {
        name: "GameHub_Singapore",
        rating: 4.5,
        verified: true
      },
      totalBids: 56,
      category: "Electronics",
      views: 312,
      shippingIncluded: true
    },
    {
      id: 7,
      title: "Antique Chinese Porcelain Vase",
      description: "Qing Dynasty porcelain vase with authentication certificate",
      currentBid: 1200,
      reservePrice: 800,
      timeRemaining: { hours: 18, minutes: 20, seconds: 35 },
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
      seller: {
        name: "AntiqueDealer_Chinatown",
        rating: 4.8,
        verified: true
      },
      totalBids: 23,
      category: "Art & Collectibles",
      views: 167,
      shippingIncluded: false
    },
    {
      id: 8,
      title: "Canon EOS R5 Mirrorless Camera",
      description: "Professional camera with 24-105mm lens, barely used",
      currentBid: 2400,
      reservePrice: 2000,
      timeRemaining: { hours: 4, minutes: 55, seconds: 25 },
      image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop",
      seller: {
        name: "PhotoPro_Singapore",
        rating: 4.7,
        verified: true
      },
      totalBids: 38,
      category: "Electronics",
      views: 198,
      shippingIncluded: true
    },
    {
      id: 9,
      title: "Rolex Submariner Date 116610LN",
      description: "Authentic Rolex Submariner with box and papers, excellent condition",
      currentBid: 9200,
      reservePrice: 8500,
      timeRemaining: { hours: 0, minutes: 45, seconds: 12 },
      image: "https://images.unsplash.com/photo-1523170335258-f5c6c6bd6eaf?w=400&h=300&fit=crop",
      seller: {
        name: "LuxuryWatches_SG",
        rating: 4.9,
        verified: true
      },
      totalBids: 124,
      category: "Watches & Jewelry",
      views: 567,
      shippingIncluded: false,
      featured: true
    },
    {
      id: 10,
      title: "Vintage Fender Stratocaster 1965",
      description: "Original vintage Fender Stratocaster in sunburst finish",
      currentBid: 3800,
      reservePrice: 3200,
      timeRemaining: { hours: 15, minutes: 30, seconds: 40 },
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
      seller: {
        name: "MusicStore_Singapore",
        rating: 4.6,
        verified: true
      },
      totalBids: 45,
      category: "Music & Instruments",
      views: 234,
      shippingIncluded: true
    },
    {
      id: 11,
      title: "Nike Air Jordan 1 Retro High OG",
      description: "Deadstock Air Jordan 1 in Chicago colorway, size US 9",
      currentBid: 420,
      reservePrice: 350,
      timeRemaining: { hours: 7, minutes: 18, seconds: 55 },
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop",
      seller: {
        name: "SneakerHead_SG",
        rating: 4.4,
        verified: false
      },
      totalBids: 29,
      category: "Fashion & Accessories",
      views: 145,
      shippingIncluded: true
    },
    {
      id: 12,
      title: "Dyson V15 Detect Absolute Vacuum",
      description: "Latest Dyson cordless vacuum with laser detection",
      currentBid: 580,
      reservePrice: 500,
      timeRemaining: { hours: 9, minutes: 25, seconds: 30 },
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
      seller: {
        name: "HomeAppliances_SG",
        rating: 4.5,
        verified: true
      },
      totalBids: 31,
      category: "Home & Garden",
      views: 178,
      shippingIncluded: true
    }
  ];

  useEffect(() => {
    // Simulate loading and filtering
    setLoading(true);
    setTimeout(() => {
      let filteredAuctions = [...mockAuctions];

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
      setLoading(false);
    }, 500);
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