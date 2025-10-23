"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import FilterPanel from '../../components/pages/auction-listings/FilterPanel';
import SortControls from '../../components/pages/auction-listings/SortControls';
import AuctionGrid from '../../components/pages/auction-listings/AuctionGrid';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const AuctionListings = () => {
  const router = useRouter();
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    location: 'all',
    priceRange: { min: '', max: '' },
    search: ''
  });

  const [sortBy, setSortBy] = useState('ending-time');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Mock auction data
  const [allAuctions] = useState([
    {
      id: 1,
      title: "Vintage Rolex Submariner Watch",
      description: "Authentic 1970s Rolex Submariner in excellent condition. Comes with original box and papers. A true collector's piece.",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop",
      currentBid: 8500,
      bidIncrement: 100,
      bidCount: 23,
      reservePrice: 8000,
      startTime: "2024-09-25T10:00:00Z",
      endTime: "2024-09-30T18:00:00Z",
      category: "collectibles",
      location: "central",
      seller: {
        id: 1,
        name: "WatchCollector_SG",
        rating: 4.9,
        verified: true
      }
    },
    {
      id: 2,
      title: "MacBook Pro 16-inch M3 Max",
      description: "Brand new MacBook Pro with M3 Max chip, 32GB RAM, 1TB SSD. Still sealed in original packaging.",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
      currentBid: 3200,
      bidIncrement: 50,
      bidCount: 45,
      reservePrice: 0,
      startTime: "2024-09-28T09:00:00Z",
      endTime: "2024-09-29T21:00:00Z",
      category: "electronics",
      location: "north",
      seller: {
        id: 2,
        name: "TechDeals_Singapore",
        rating: 4.7,
        verified: true
      }
    },
    {
      id: 3,
      title: "Designer Handbag Collection",
      description: "Authentic Louis Vuitton, Chanel, and Hermès handbags. All items authenticated and in pristine condition.",
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=300&fit=crop",
      currentBid: 2800,
      bidIncrement: 100,
      bidCount: 18,
      reservePrice: 2500,
      startTime: "2024-09-26T14:00:00Z",
      endTime: "2024-10-01T20:00:00Z",
      category: "fashion",
      location: "central",
      seller: {
        id: 3,
        name: "LuxuryItems_SG",
        rating: 4.8,
        verified: true
      }
    },
    {
      id: 4,
      title: "Antique Chinese Porcelain Vase",
      description: "Ming Dynasty porcelain vase with intricate blue and white patterns. Authenticated by experts.",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
      currentBid: 1200,
      bidIncrement: 50,
      bidCount: 12,
      reservePrice: 1000,
      startTime: "2024-09-27T11:00:00Z",
      endTime: "2024-10-02T16:00:00Z",
      category: "art",
      location: "east",
      seller: {
        id: 4,
        name: "AntiqueCollector",
        rating: 4.6,
        verified: false
      }
    },
    {
      id: 5,
      title: "Gaming Setup - RTX 4090 PC",
      description: "High-end gaming PC with RTX 4090, Intel i9-13900K, 32GB DDR5 RAM. Perfect for 4K gaming and content creation.",
      image: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400&h=300&fit=crop",
      currentBid: 4500,
      bidIncrement: 100,
      bidCount: 31,
      reservePrice: 4000,
      startTime: "2024-09-28T16:00:00Z",
      endTime: "2024-09-30T22:00:00Z",
      category: "electronics",
      location: "west",
      seller: {
        id: 5,
        name: "GamerHub_SG",
        rating: 4.5,
        verified: true
      }
    },
    {
      id: 6,
      title: "Teak Wood Dining Set",
      description: "Beautiful handcrafted teak wood dining table with 6 chairs. Perfect for modern homes.",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
      currentBid: 800,
      bidIncrement: 25,
      bidCount: 8,
      reservePrice: 0,
      startTime: "2024-09-25T12:00:00Z",
      endTime: "2024-10-03T18:00:00Z",
      category: "home",
      location: "south",
      seller: {
        id: 6,
        name: "FurnitureCraft",
        rating: 4.4,
        verified: false
      }
    },
    {
      id: 7,
      title: "Rare Pokemon Card Collection",
      description: "First edition Pokemon cards including Charizard, Blastoise, and Venusaur. All cards graded PSA 9+.",
      image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop",
      currentBid: 5200,
      bidIncrement: 100,
      bidCount: 67,
      reservePrice: 5000,
      startTime: "2024-09-29T08:00:00Z",
      endTime: "2024-09-29T20:00:00Z",
      category: "collectibles",
      location: "central",
      seller: {
        id: 7,
        name: "CardMaster_SG",
        rating: 4.9,
        verified: true
      }
    },
    {
      id: 8,
      title: "Professional Camera Kit",
      description: "Canon EOS R5 with 24-70mm f/2.8L lens, extra batteries, memory cards, and professional carrying case.",
      image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop",
      currentBid: 2400,
      bidIncrement: 50,
      bidCount: 19,
      reservePrice: 2200,
      startTime: "2024-09-27T15:00:00Z",
      endTime: "2024-10-01T19:00:00Z",
      category: "electronics",
      location: "north",
      seller: {
        id: 8,
        name: "PhotoPro_Singapore",
        rating: 4.7,
        verified: true
      }
    },
    {
      id: 9,
      title: "Vintage Vinyl Record Collection",
      description: "Rare vinyl records from the 60s-80s including Beatles, Pink Floyd, Led Zeppelin. All in mint condition.",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
      currentBid: 650,
      bidIncrement: 25,
      bidCount: 14,
      reservePrice: 0,
      startTime: "2024-09-26T10:00:00Z",
      endTime: "2024-10-04T17:00:00Z",
      category: "books",
      location: "east",
      seller: {
        id: 9,
        name: "VinylCollector",
        rating: 4.3,
        verified: false
      }
    }
  ]);

  const [filteredAuctions, setFilteredAuctions] = useState(allAuctions);

  useEffect(() => {
    filterAndSortAuctions();
  }, [filters, sortBy, sortOrder]);

  const filterAndSortAuctions = () => {
    setLoading(true);
    
    setTimeout(() => {
      let filtered = [...allAuctions];

      // Apply filters
      if (filters?.category !== 'all') {
        filtered = filtered?.filter(auction => auction?.category === filters?.category);
      }

      if (filters?.location !== 'all') {
        filtered = filtered?.filter(auction => auction?.location === filters?.location);
      }

      if (filters?.search) {
        const searchTerm = filters?.search?.toLowerCase();
        filtered = filtered?.filter(auction => 
          auction?.title?.toLowerCase()?.includes(searchTerm) ||
          auction?.description?.toLowerCase()?.includes(searchTerm)
        );
      }

      if (filters?.priceRange?.min) {
        filtered = filtered?.filter(auction => auction?.currentBid >= parseInt(filters?.priceRange?.min));
      }

      if (filters?.priceRange?.max) {
        filtered = filtered?.filter(auction => auction?.currentBid <= parseInt(filters?.priceRange?.max));
      }

      if (filters?.status !== 'all') {
        const now = new Date();
        filtered = filtered?.filter(auction => {
          const endTime = new Date(auction.endTime);
          const timeLeft = endTime - now;
          
          switch (filters?.status) {
            case 'ending-soon':
              return timeLeft > 0 && timeLeft <= 24 * 60 * 60 * 1000;
            case 'reserve-met':
              return auction?.currentBid >= auction?.reservePrice && auction?.reservePrice > 0;
            case 'no-reserve':
              return auction?.reservePrice === 0;
            default:
              return timeLeft > 0;
          }
        });
      }

      // Apply sorting
      filtered?.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'ending-time':
            comparison = new Date(a.endTime) - new Date(b.endTime);
            break;
          case 'bid-activity':
            comparison = a?.bidCount - b?.bidCount;
            break;
          case 'current-price':
            comparison = a?.currentBid - b?.currentBid;
            break;
          case 'newest':
            comparison = new Date(a.startTime) - new Date(b.startTime);
            break;
          case 'alphabetical':
            comparison = a?.title?.localeCompare(b?.title);
            break;
          case 'seller-rating':
            comparison = a?.seller?.rating - b?.seller?.rating;
            break;
          default:
            comparison = 0;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });

      setFilteredAuctions(filtered);
      setLoading(false);
    }, 500);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleViewModeChange = (newViewMode) => {
    setViewMode(newViewMode);
  };

  const handleLoadMore = () => {
    setLoading(true);
    setTimeout(() => {
      setHasMore(false);
      setLoading(false);
    }, 1000);
  };

  const breadcrumbItems = [
    { label: 'Home', path: '/home-page' },
    { label: 'Browse Auctions', path: '/auction-listings', isActive: true }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumb customItems={breadcrumbItems} />
        
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Browse Auctions
            </h1>
            <p className="text-muted-foreground">
              Discover unique items and place your bids on Singapore's premier auction marketplace
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => router.push('/create-auction')}
              iconName="Plus"
              iconPosition="left"
            >
              Create Auction
            </Button>
            <Button
              variant="default"
              onClick={() => window.location?.reload()}
              iconName="RefreshCw"
              iconPosition="left"
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              isOpen={isFilterOpen}
              onToggle={() => setIsFilterOpen(!isFilterOpen)}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <SortControls
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              totalResults={filteredAuctions?.length}
            />

            <AuctionGrid
              auctions={filteredAuctions}
              viewMode={viewMode}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="fixed bottom-6 right-6 lg:hidden">
          <div className="flex flex-col space-y-3">
            <Button
              variant="default"
              size="icon"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-12 h-12 rounded-full shadow-lg"
            >
              <Icon name="Filter" size={20} />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-12 h-12 rounded-full shadow-lg"
            >
              <Icon name="ArrowUp" size={20} />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuctionListings;