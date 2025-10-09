import React, { useState, useEffect } from 'react';
import AuctionCard from './AuctionCard';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { auctionService } from '../../../lib/services';

const ActiveAuctionsGrid = ({ filters }) => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(12);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuctions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await auctionService.getAuctions(filters);
        setAuctions(data);
      } catch (err) {
        console.error('Error fetching auctions:', err);
        setError('Failed to load auctions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
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

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="AlertCircle" size={32} className="text-destructive" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Error Loading Auctions</h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button
          variant="outline"
          onClick={() => window.location?.reload()}
          iconName="RotateCcw"
          iconPosition="left"
        >
          Try Again
        </Button>
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