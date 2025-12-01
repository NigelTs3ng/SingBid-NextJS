import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const FilterPanel = ({ filters, onFiltersChange, isOpen, onToggle }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'fashion', label: 'Fashion & Accessories' },
    { value: 'home', label: 'Home & Garden' },
    { value: 'collectibles', label: 'Collectibles' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'sports', label: 'Sports & Recreation' },
    { value: 'books', label: 'Books & Media' },
    { value: 'art', label: 'Art & Crafts' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active Auctions' },
    { value: 'ending-soon', label: 'Ending Soon (24h)' },
    { value: 'reserve-met', label: 'Reserve Met' },
    { value: 'no-reserve', label: 'No Reserve' }
  ];

  const locationOptions = [
    { value: 'all', label: 'All Singapore' },
    { value: 'central', label: 'Central Singapore' },
    { value: 'north', label: 'North Singapore' },
    { value: 'south', label: 'South Singapore' },
    { value: 'east', label: 'East Singapore' },
    { value: 'west', label: 'West Singapore' }
  ];

  const handleFilterChange = (key, value) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handlePriceChange = (type, value) => {
    const updatedFilters = {
      ...localFilters,
      priceRange: {
        ...localFilters?.priceRange,
        [type]: value
      }
    };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      category: 'all',
      status: 'all',
      location: 'all',
      priceRange: { min: '', max: '' },
      search: ''
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const hasActiveFilters = () => {
    return localFilters?.category !== 'all' ||
           localFilters?.status !== 'all' ||
           localFilters?.location !== 'all' ||
           localFilters?.priceRange?.min ||
           localFilters?.priceRange?.max ||
           localFilters?.search;
  };

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          onClick={onToggle}
          iconName="Filter"
          iconPosition="left"
          className="w-full"
        >
          Filters {hasActiveFilters() && `(${Object.values(localFilters)?.filter(v => v && v !== 'all')?.length})`}
        </Button>
      </div>
      {/* Filter Panel */}
      <div className={`
        lg:block bg-card border border-border rounded-lg p-6
        ${isOpen ? 'block' : 'hidden'}
        lg:sticky lg:top-20 lg:h-fit
      `}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Filters</h3>
          <div className="flex items-center space-x-2">
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                iconName="X"
                iconPosition="left"
              >
                Clear
              </Button>
            )}
            <button
              onClick={onToggle}
              className="lg:hidden p-1 hover:bg-muted rounded"
            >
              <Icon name="X" size={20} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Search */}
          <div>
            <Input
              label="Search Auctions"
              type="search"
              placeholder="Search by title, description..."
              value={localFilters?.search}
              onChange={(e) => handleFilterChange('search', e?.target?.value)}
            />
          </div>

          {/* Category */}
          <div>
            <Select
              label="Category"
              options={categoryOptions}
              value={localFilters?.category}
              onChange={(value) => handleFilterChange('category', value)}
            />
          </div>

          {/* Status */}
          <div>
            <Select
              label="Auction Status"
              options={statusOptions}
              value={localFilters?.status}
              onChange={(value) => handleFilterChange('status', value)}
            />
          </div>

          {/* Location */}
          <div>
            <Select
              label="Location"
              options={locationOptions}
              value={localFilters?.location}
              onChange={(value) => handleFilterChange('location', value)}
            />
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Price Range (USD)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters?.priceRange?.min}
                onChange={(e) => handlePriceChange('min', e?.target?.value)}
              />
              <Input
                type="number"
                placeholder="Max"
                value={localFilters?.priceRange?.max}
                onChange={(e) => handlePriceChange('max', e?.target?.value)}
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Quick Filters
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={localFilters?.status === 'ending-soon' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('status', localFilters?.status === 'ending-soon' ? 'all' : 'ending-soon')}
              >
                Ending Soon
              </Button>
              <Button
                variant={localFilters?.status === 'no-reserve' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('status', localFilters?.status === 'no-reserve' ? 'all' : 'no-reserve')}
              >
                No Reserve
              </Button>
              <Button
                variant={localFilters?.status === 'reserve-met' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('status', localFilters?.status === 'reserve-met' ? 'all' : 'reserve-met')}
              >
                Reserve Met
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterPanel;