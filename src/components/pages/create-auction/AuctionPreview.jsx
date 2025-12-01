import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const AuctionPreview = ({ formData, images }) => {
  const [viewMode, setViewMode] = useState('desktop'); // desktop, mobile

  const formatPrice = (price) => {
    return `$${parseFloat(price || 0)?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDateTime = (date, time) => {
    if (!date || !time) return 'Not set';
    
    const dateTime = new Date(`${date}T${time}`);
    return dateTime?.toLocaleString('en-US', {
      timeZone: 'Asia/Singapore',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEndDateTime = () => {
    if (!formData?.startDate || !formData?.startTime || !formData?.duration) return 'Not set';
    
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + (parseInt(formData.duration) * 24 * 60 * 60 * 1000));
    
    return endDateTime?.toLocaleString('en-US', {
      timeZone: 'Asia/Singapore',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getCategoryLabel = (value) => {
    const categories = {
      'electronics': 'Electronics & Gadgets',
      'fashion': 'Fashion & Accessories',
      'home': 'Home & Garden',
      'collectibles': 'Collectibles & Antiques',
      'books': 'Books & Media',
      'sports': 'Sports & Recreation',
      'automotive': 'Automotive',
      'art': 'Art & Crafts',
      'jewelry': 'Jewelry & Watches',
      'toys': 'Toys & Games',
      'music': 'Musical Instruments',
      'other': 'Other'
    };
    return categories?.[value] || value;
  };

  const getConditionLabel = (value) => {
    const conditions = {
      'new': 'Brand New',
      'like-new': 'Like New',
      'good': 'Good',
      'fair': 'Fair',
      'poor': 'Poor'
    };
    return conditions?.[value] || value;
  };

  const getConditionColor = (condition) => {
    const colors = {
      'new': 'bg-green-100 text-green-800',
      'like-new': 'bg-blue-100 text-blue-800',
      'good': 'bg-yellow-100 text-yellow-800',
      'fair': 'bg-orange-100 text-orange-800',
      'poor': 'bg-red-100 text-red-800'
    };
    return colors?.[condition] || 'bg-gray-100 text-gray-800';
  };

  const DesktopPreview = () => (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {formData?.title || 'Auction Title'}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center space-x-1">
                <Icon name="Tag" size={14} />
                <span>{getCategoryLabel(formData?.category)}</span>
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(formData?.condition)}`}>
                {getConditionLabel(formData?.condition)}
              </span>
              {formData?.itemLocation && (
                <span className="flex items-center space-x-1">
                  <Icon name="MapPin" size={14} />
                  <span>{formData?.itemLocation}</span>
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {formatPrice(formData?.reservePrice)}
            </div>
            <div className="text-sm text-muted-foreground">Reserve Price</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Images */}
        <div className="space-y-4">
          {images?.length > 0 ? (
            <>
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                <Image
                  src={images?.[0]?.url}
                  alt="Main auction image"
                  className="w-full h-full object-cover"
                />
              </div>
              {images?.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images?.slice(1, 5)?.map((image, index) => (
                    <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <Image
                        src={image?.url}
                        alt={`Auction image ${index + 2}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Icon name="Image" size={48} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No images uploaded</p>
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Timing */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center space-x-2">
              <Icon name="Clock" size={16} />
              <span>Auction Timing</span>
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Starts:</span>
                <span className="text-foreground font-medium">
                  {formatDateTime(formData?.startDate, formData?.startTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ends:</span>
                <span className="text-foreground font-medium">
                  {getEndDateTime()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="text-foreground font-medium">
                  {formData?.duration ? `${formData?.duration} days` : 'Not set'}
                </span>
              </div>
            </div>
          </div>

          {/* Bidding Section */}
          <div className="border border-border rounded-lg p-4">
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-primary mb-1">
                {formatPrice(formData?.reservePrice)}
              </div>
              <div className="text-sm text-muted-foreground">Current Bid (Reserve)</div>
            </div>
            
            <Button variant="primary" fullWidth disabled>
              Place Bid
            </Button>
            
            <div className="mt-3 text-center">
              <p className="text-xs text-muted-foreground">
                Auction preview - bidding not available
              </p>
            </div>
          </div>

          {/* Shipping Info */}
          {formData?.shippingMethod && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground flex items-center space-x-2">
                <Icon name="Truck" size={16} />
                <span>Shipping</span>
              </h4>
              <p className="text-sm text-muted-foreground">
                {formData?.shippingMethod === 'pickup' && 'Pickup only'}
                {formData?.shippingMethod === 'local' && 'Local delivery available'}
                {formData?.shippingMethod === 'nationwide' && 'Singapore-wide shipping'}
                {formData?.shippingMethod === 'both' && 'Pickup & delivery options'}
              </p>
              {formData?.shippingCost && (
                <p className="text-sm text-foreground font-medium">
                  Shipping: {formatPrice(formData?.shippingCost)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {formData?.description && (
        <div className="border-t border-border p-6">
          <h3 className="font-semibold text-foreground mb-3">Description</h3>
          <div className="text-foreground whitespace-pre-wrap">
            {formData?.description}
          </div>
        </div>
      )}
    </div>
  );

  const MobilePreview = () => (
    <div className="bg-card border border-border rounded-lg overflow-hidden max-w-sm mx-auto">
      {/* Images */}
      <div className="relative">
        {images?.length > 0 ? (
          <div className="aspect-square bg-muted">
            <Image
              src={images?.[0]?.url}
              alt="Main auction image"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square bg-muted flex items-center justify-center">
            <Icon name="Image" size={32} className="text-muted-foreground" />
          </div>
        )}
        
        {images?.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            +{images?.length - 1} more
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div>
          <h2 className="font-bold text-foreground text-lg mb-1">
            {formData?.title || 'Auction Title'}
          </h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(formData?.condition)}`}>
              {getConditionLabel(formData?.condition)}
            </span>
            {formData?.itemLocation && (
              <span className="flex items-center space-x-1">
                <Icon name="MapPin" size={12} />
                <span>{formData?.itemLocation}</span>
              </span>
            )}
          </div>
        </div>

        <div className="text-center py-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-primary">
            {formatPrice(formData?.reservePrice)}
          </div>
          <div className="text-sm text-muted-foreground">Reserve Price</div>
        </div>

        <Button variant="primary" fullWidth disabled>
          Place Bid
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Starts:</span>
            <span>{formatDateTime(formData?.startDate, formData?.startTime)}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{formData?.duration ? `${formData?.duration} days` : 'Not set'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon name="Eye" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Preview</h3>
        </div>
        
        <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
              viewMode === 'desktop' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name="Monitor" size={16} className="inline mr-1" />
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
              viewMode === 'mobile' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name="Smartphone" size={16} className="inline mr-1" />
            Mobile
          </button>
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-6">
        {viewMode === 'desktop' ? <DesktopPreview /> : <MobilePreview />}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Icon name="Info" size={16} className="text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Preview Notes</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• This is how your auction will appear to potential bidders</li>
              <li>• Images and details can be edited before publishing</li>
              <li>• Actual bidding functionality will be available once published</li>
              <li>• Review all information carefully before submission</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionPreview;