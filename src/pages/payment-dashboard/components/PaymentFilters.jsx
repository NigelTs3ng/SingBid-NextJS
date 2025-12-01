import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const PaymentFilters = ({ onFilterChange, onExport }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: '',
    status: '',
    transactionType: '',
    minAmount: '',
    maxAmount: '',
    searchTerm: ''
  });

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
    { value: 'disputed', label: 'Disputed' }
  ];

  const transactionTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'payment', label: 'Payments' },
    { value: 'payout', label: 'Payouts' },
    { value: 'refund', label: 'Refunds' },
    { value: 'fee', label: 'Platform Fees' }
  ];

  const dateRangeOptions = [
    { value: '', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      dateRange: '',
      status: '',
      transactionType: '',
      minAmount: '',
      maxAmount: '',
      searchTerm: ''
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters)?.some(value => value !== '');

  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-6">
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          fullWidth
          iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
          iconPosition="right"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          Filters {hasActiveFilters && <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">Active</span>}
        </Button>
      </div>
      {/* Filter Content */}
      <div className={`${isExpanded ? 'block' : 'hidden'} lg:block mt-4 lg:mt-0`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2 lg:col-span-1">
            <Input
              type="search"
              placeholder="Search transactions..."
              value={filters?.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e?.target?.value)}
            />
          </div>

          {/* Date Range */}
          <Select
            placeholder="Select date range"
            options={dateRangeOptions}
            value={filters?.dateRange}
            onChange={(value) => handleFilterChange('dateRange', value)}
          />

          {/* Status */}
          <Select
            placeholder="Select status"
            options={statusOptions}
            value={filters?.status}
            onChange={(value) => handleFilterChange('status', value)}
          />

          {/* Transaction Type */}
          <Select
            placeholder="Select type"
            options={transactionTypeOptions}
            value={filters?.transactionType}
            onChange={(value) => handleFilterChange('transactionType', value)}
          />
        </div>

        {/* Amount Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-1">
            <Input
              type="number"
              placeholder="Min amount (USD)"
              value={filters?.minAmount}
              onChange={(e) => handleFilterChange('minAmount', e?.target?.value)}
            />
          </div>
          <div className="md:col-span-1">
            <Input
              type="number"
              placeholder="Max amount (USD)"
              value={filters?.maxAmount}
              onChange={(e) => handleFilterChange('maxAmount', e?.target?.value)}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-2 flex space-x-2">
            <Button
              variant="outline"
              iconName="RotateCcw"
              iconPosition="left"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </Button>
            <Button
              variant="outline"
              iconName="Download"
              iconPosition="left"
              onClick={onExport}
            >
              Export
            </Button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters?.searchTerm && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                Search: {filters?.searchTerm}
                <button
                  onClick={() => handleFilterChange('searchTerm', '')}
                  className="ml-1 hover:text-primary/80"
                >
                  <Icon name="X" size={12} />
                </button>
              </span>
            )}
            {filters?.status && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                Status: {statusOptions?.find(opt => opt?.value === filters?.status)?.label}
                <button
                  onClick={() => handleFilterChange('status', '')}
                  className="ml-1 hover:text-primary/80"
                >
                  <Icon name="X" size={12} />
                </button>
              </span>
            )}
            {filters?.transactionType && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                Type: {transactionTypeOptions?.find(opt => opt?.value === filters?.transactionType)?.label}
                <button
                  onClick={() => handleFilterChange('transactionType', '')}
                  className="ml-1 hover:text-primary/80"
                >
                  <Icon name="X" size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentFilters;