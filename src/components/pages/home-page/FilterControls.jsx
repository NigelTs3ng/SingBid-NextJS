import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const FilterControls = ({ onFilterChange, activeFilters }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'watches', label: 'Watches & Jewelry' },
    { value: 'art', label: 'Art & Collectibles' },
    { value: 'fashion', label: 'Fashion & Accessories' },
    { value: 'home', label: 'Home & Garden' },
    { value: 'sports', label: 'Sports & Recreation' },
    { value: 'books', label: 'Books & Media' },
    { value: 'automotive', label: 'Automotive' }
  ];

  const sortOptions = [
    { value: 'ending_soon', label: 'Ending Soon' },
    { value: 'newest', label: 'Newest First' },
    { value: 'highest_bid', label: 'Highest Bid' },
    { value: 'lowest_bid', label: 'Lowest Bid' },
    { value: 'most_bids', label: 'Most Bids' },
    { value: 'alphabetical', label: 'A-Z' }
  ];

  const priceRangeOptions = [
    { value: 'all', label: 'All Prices' },
    { value: '0-100', label: 'Under $100' },
    { value: '100-500', label: '$100 - $500' },
    { value: '500-1000', label: '$500 - $1,000' },
    { value: '1000-5000', label: '$1,000 - $5,000' },
    { value: '5000+', label: 'Over $5,000' }
  ];

  const timeRemainingOptions = [
    { value: 'all', label: 'All Auctions' },
    { value: '1h', label: 'Ending in 1 hour' },
    { value: '6h', label: 'Ending in 6 hours' },
    { value: '24h', label: 'Ending in 24 hours' },
    { value: '7d', label: 'Ending in 7 days' }
  ];

  const handleFilterChange = (filterType, value) => {
    onFilterChange({
      ...activeFilters,
      [filterType]: value
    });
  };

  const clearAllFilters = () => {
    onFilterChange({
      category: 'all',
      sortBy: 'ending_soon',
      priceRange: 'all',
      timeRemaining: 'all'
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters?.category !== 'all') count++;
    if (activeFilters?.priceRange !== 'all') count++;
    if (activeFilters?.timeRemaining !== 'all') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Icon name="Filter" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Filter Auctions</h3>
          {activeFilterCount > 0 && (
            <div className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
              {activeFilterCount} active
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              iconName="X"
              iconPosition="left"
              className="text-muted-foreground hover:text-foreground"
            >
              Clear All
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
            iconPosition="right"
            className="lg:hidden"
          >
            {isExpanded ? 'Less' : 'More'} Filters
          </Button>
        </div>
      </div>
      {/* Quick Filters - Always Visible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Select
          label="Category"
          options={categoryOptions}
          value={activeFilters?.category}
          onChange={(value) => handleFilterChange('category', value)}
          className="w-full"
        />
        
        <Select
          label="Sort By"
          options={sortOptions}
          value={activeFilters?.sortBy}
          onChange={(value) => handleFilterChange('sortBy', value)}
          className="w-full"
        />
        
        <div className={`lg:block ${isExpanded ? 'block' : 'hidden'}`}>
          <Select
            label="Price Range"
            options={priceRangeOptions}
            value={activeFilters?.priceRange}
            onChange={(value) => handleFilterChange('priceRange', value)}
            className="w-full"
          />
        </div>
        
        <div className={`lg:block ${isExpanded ? 'block' : 'hidden'}`}>
          <Select
            label="Time Remaining"
            options={timeRemainingOptions}
            value={activeFilters?.timeRemaining}
            onChange={(value) => handleFilterChange('timeRemaining', value)}
            className="w-full"
          />
        </div>
      </div>
      {/* Advanced Filters - Expandable on Mobile */}
      <div className={`lg:block ${isExpanded ? 'block' : 'hidden'}`}>
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Quick Action Buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Quick Actions</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeFilters?.timeRemaining === '1h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('timeRemaining', activeFilters?.timeRemaining === '1h' ? 'all' : '1h')}
                  iconName="Clock"
                  iconPosition="left"
                >
                  Ending Soon
                </Button>
                <Button
                  variant={activeFilters?.category === 'electronics' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('category', activeFilters?.category === 'electronics' ? 'all' : 'electronics')}
                  iconName="Smartphone"
                  iconPosition="left"
                >
                  Electronics
                </Button>
              </div>
            </div>

            {/* Trust Filters */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Seller Trust</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  iconName="Shield"
                  iconPosition="left"
                >
                  Verified Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  iconName="Star"
                  iconPosition="left"
                >
                  Top Rated
                </Button>
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Location</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  iconName="MapPin"
                  iconPosition="left"
                >
                  Singapore Only
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Results Summary */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          Showing active auctions • Updated in real-time
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span>Live Updates</span>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;