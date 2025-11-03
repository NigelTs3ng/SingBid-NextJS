"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import FilterPanel from '../../components/pages/auction-listings/FilterPanel';
import SortControls from '../../components/pages/auction-listings/SortControls';
import AuctionGrid from '../../components/pages/auction-listings/AuctionGrid';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const AuctionListings = () => {
  const router = useRouter();
  const { user, userProfile } = useAuth();
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
  const [allAuctions, setAllAuctions] = useState([]);
  const [error, setError] = useState(null);
  
  // Remove mock data - we'll fetch from API

  const [filteredAuctions, setFilteredAuctions] = useState([]);

  // Fetch auctions from API
  useEffect(() => {
    const fetchAuctions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/auctions?status=active');
        if (!response.ok) {
          throw new Error('Failed to fetch auctions');
        }
        
        const { auctions } = await response.json();
        console.log('Fetched auctions:', auctions);
        setAllAuctions(auctions || []);
        
      } catch (error) {
        console.error('Error fetching auctions:', error);
        setError(error.message);
        setAllAuctions([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAuctions();
  }, []);

  useEffect(() => {
    filterAndSortAuctions();
  }, [allAuctions, filters, sortBy, sortOrder]);

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
        filtered = filtered?.filter(auction => auction?.current_price >= parseInt(filters?.priceRange?.min));
      }

      if (filters?.priceRange?.max) {
        filtered = filtered?.filter(auction => auction?.current_price <= parseInt(filters?.priceRange?.max));
      }

      if (filters?.status !== 'all') {
        const now = new Date();
        filtered = filtered?.filter(auction => {
          const endTime = new Date(auction.end_time);
          const timeLeft = endTime - now;
          
          switch (filters?.status) {
            case 'ending-soon':
              return timeLeft > 0 && timeLeft <= 24 * 60 * 60 * 1000;
            case 'active':
              return auction?.status === 'active' && timeLeft > 0;
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
            comparison = new Date(a.end_time) - new Date(b.end_time);
            break;
          case 'bid-activity':
            comparison = (a?.bid_count || 0) - (b?.bid_count || 0);
            break;
          case 'current-price':
            comparison = (a?.current_price || 0) - (b?.current_price || 0);
            break;
          case 'newest':
            comparison = new Date(b.created_at) - new Date(a.created_at);
            break;
          case 'alphabetical':
            comparison = a?.title?.localeCompare(b?.title);
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
            {/* Only show Create Auction button to sellers or unauthenticated users */}
            {(!user || userProfile?.user_role === 'seller') && (
              <Button
                variant="outline"
                onClick={() => router.push('/create-auction')}
                iconName="Plus"
                iconPosition="left"
              >
                Create Auction
              </Button>
            )}
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