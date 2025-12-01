import React from 'react';
import Icon from '../../AppIcon';

const AuctionInfo = ({ auction }) => {
  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(price);
  };

  const formatDate = (date) => {
    if (!date) return 'Date not available';
    
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return 'Invalid date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })?.format(parsedDate);
    } catch (error) {
      return 'Date not available';
    }
  };

  // Guard against missing auction data
  if (!auction) {
    return (
      <div className="space-y-6">
        <div className="bg-muted rounded-lg p-6 text-center">
          <p className="text-muted-foreground">Loading auction information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title and Category */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <span className="px-3 py-1 bg-accent text-accent-foreground text-sm font-medium rounded-full">
            {auction?.category}
          </span>
          {auction?.featured && (
            <span className="px-3 py-1 bg-warning text-warning-foreground text-sm font-medium rounded-full flex items-center space-x-1">
              <Icon name="Star" size={14} />
              <span>Featured</span>
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{auction?.title}</h1>
        <p className="text-muted-foreground">{auction?.description}</p>
      </div>
      {/* Price Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <Icon name="DollarSign" size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Starting Price</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatPrice(auction?.startingPrice)}</p>
        </div>

        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <Icon name="Shield" size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Reserve Price</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {auction?.reserveMet ? (
              <span className="text-success flex items-center space-x-1">
                <Icon name="CheckCircle" size={20} />
                <span>Met</span>
              </span>
            ) : (
              <span className="text-warning">Not Met</span>
            )}
          </p>
        </div>
      </div>
      {/* Auction Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <Icon name="Calendar" size={16} className="text-muted-foreground" />
            <span className="font-medium">Start Time</span>
          </div>
          <span className="text-muted-foreground">{formatDate(auction?.startTime)}</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <Icon name="Clock" size={16} className="text-muted-foreground" />
            <span className="font-medium">End Time</span>
          </div>
          <span className="text-muted-foreground">{formatDate(auction?.endTime)}</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <Icon name="Users" size={16} className="text-muted-foreground" />
            <span className="font-medium">Total Bids</span>
          </div>
          <span className="text-muted-foreground">{auction?.totalBids}</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <Icon name="MapPin" size={16} className="text-muted-foreground" />
            <span className="font-medium">Location</span>
          </div>
          <span className="text-muted-foreground">{auction?.location}</span>
        </div>

        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-2">
            <Icon name="Truck" size={16} className="text-muted-foreground" />
            <span className="font-medium">Shipping</span>
          </div>
          <span className="text-muted-foreground">{auction?.shippingInfo}</span>
        </div>
      </div>
      {/* Condition and Authenticity */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center space-x-2">
          <Icon name="Info" size={16} />
          <span>Item Details</span>
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Condition:</span>
            <p className="font-medium">{auction?.condition}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Authenticity:</span>
            <p className="font-medium flex items-center space-x-1">
              {auction?.authenticated ? (
                <>
                  <Icon name="CheckCircle" size={14} className="text-success" />
                  <span>Verified</span>
                </>
              ) : (
                <>
                  <Icon name="AlertCircle" size={14} className="text-warning" />
                  <span>Not Verified</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionInfo;