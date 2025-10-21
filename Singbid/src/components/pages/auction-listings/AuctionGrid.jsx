import React from 'react';
import AuctionCard from './AuctionCard';
import Icon from '../../../components/AppIcon';

const AuctionGrid = ({ auctions, viewMode, loading, hasMore, onLoadMore }) => {
  if (loading && auctions?.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(9)]?.map((_, index) => (
          <div key={index} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-muted"></div>
            <div className="p-4">
              <div className="h-6 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded mb-3 w-3/4"></div>
              <div className="flex justify-between items-center mb-3">
                <div className="h-8 bg-muted rounded w-20"></div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-muted rounded-full"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (auctions?.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Search" size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No auctions found</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Try adjusting your filters or search terms to find more auctions.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location?.reload()}
            className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-foreground hover:bg-primary border border-primary rounded-lg transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={() => window.location.href = '/create-auction'}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Create Auction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auction Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" :"space-y-4"
      }>
        {auctions?.map((auction) => (
          <AuctionCard
            key={auction?.id}
            auction={auction}
            viewMode={viewMode}
          />
        ))}
      </div>
      {/* Load More */}
      {hasMore && (
        <div className="text-center py-8">
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-muted-foreground">Loading more auctions...</span>
            </div>
          ) : (
            <button
              onClick={onLoadMore}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Load More Auctions
            </button>
          )}
        </div>
      )}
      {/* Results Summary */}
      <div className="text-center py-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Showing {auctions?.length} of {auctions?.length + (hasMore ? 50 : 0)} auctions
        </p>
      </div>
    </div>
  );
};

export default AuctionGrid;