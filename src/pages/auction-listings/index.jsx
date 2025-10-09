"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auctionService } from '../../lib/services';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [auctions, setAuctions] = useState([]);

  useEffect(() => {
    fetchAuctions();
  }, [filters, sortBy, sortOrder]);

  const fetchAuctions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Combine filters with sorting for Supabase query
      const queryFilters = {
        ...filters,
        sortBy,
        sortOrder
      };
      
      const data = await auctionService.getAuctions(queryFilters);
      setAuctions(data);
    } catch (err) {
      console.error('Error fetching auctions:', err);
      setError('Failed to load auctions. Please try again.');
    } finally {
      setLoading(false);
    }
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
              onClick={fetchAuctions}
              iconName="RefreshCw"
              iconPosition="left"
            >
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2 text-destructive">
              <Icon name="AlertCircle" size={16} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

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
              totalResults={auctions?.length}
            />

            <AuctionGrid
              auctions={auctions}
              viewMode={viewMode}
              loading={loading}
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