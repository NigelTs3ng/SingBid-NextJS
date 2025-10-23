import React from 'react';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const SortControls = ({ sortBy, sortOrder, onSortChange, viewMode, onViewModeChange, totalResults }) => {
  const sortOptions = [
    { value: 'ending-time', label: 'Ending Time' },
    { value: 'bid-activity', label: 'Bid Activity' },
    { value: 'current-price', label: 'Current Price' },
    { value: 'newest', label: 'Newest Listed' },
    { value: 'alphabetical', label: 'Alphabetical' },
    { value: 'seller-rating', label: 'Seller Rating' }
  ];

  const handleSortChange = (value) => {
    onSortChange(value, sortOrder);
  };

  const toggleSortOrder = () => {
    onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Results Count */}
        <div className="flex items-center space-x-2">
          <Icon name="Search" size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {totalResults?.toLocaleString()} auctions found
          </span>
        </div>

        {/* Sort and View Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              Sort by:
            </span>
            <div className="flex items-center space-x-1">
              <Select
                options={sortOptions}
                value={sortBy}
                onChange={handleSortChange}
                className="min-w-[140px]"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={toggleSortOrder}
                className="flex-shrink-0"
              >
                <Icon 
                  name={sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown'} 
                  size={16} 
                />
              </Button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 border border-border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              iconName="Grid3X3"
              className="px-3"
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              iconName="List"
              className="px-3"
            >
              List
            </Button>
          </div>
        </div>
      </div>
      {/* Active Sort Indicator */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Sorted by {sortOptions?.find(opt => opt?.value === sortBy)?.label} 
            ({sortOrder === 'asc' ? 'ascending' : 'descending'})
          </span>
          <span className="flex items-center space-x-1">
            <Icon name="Clock" size={12} />
            <span>Updated just now</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SortControls;