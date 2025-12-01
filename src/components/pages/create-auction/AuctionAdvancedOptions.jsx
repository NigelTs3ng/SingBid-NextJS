import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const AuctionAdvancedOptions = ({ 
  formData, 
  onFormDataChange, 
  errors 
}) => {
  const [expandedSections, setExpandedSections] = useState({
    shipping: false,
    returns: false,
    requirements: false
  });

  const shippingOptions = [
    { value: 'pickup', label: 'Pickup Only', description: 'Buyer collects item' },
    { value: 'local', label: 'Local Delivery', description: 'Within Singapore' },
    { value: 'nationwide', label: 'Nationwide Shipping', description: 'Singapore-wide delivery' },
    { value: 'both', label: 'Pickup & Delivery', description: 'Flexible options' }
  ];

  const returnPolicyOptions = [
    { value: 'no-returns', label: 'No Returns', description: 'All sales final' },
    { value: '3-days', label: '3 Days Return', description: 'Return within 3 days' },
    { value: '7-days', label: '7 Days Return', description: 'Return within 7 days' },
    { value: '14-days', label: '14 Days Return', description: 'Return within 14 days' }
  ];

  const handleInputChange = (field, value) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev?.[section]
    }));
  };

  const formatCurrency = (value) => {
    const numericValue = value?.replace(/[^\d.]/g, '');
    const parts = numericValue?.split('.');
    if (parts?.length > 2) {
      return parts?.[0] + '.' + parts?.slice(1)?.join('');
    }
    return numericValue;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Icon name="Settings" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Advanced Options</h3>
      </div>
      {/* Shipping Details */}
      <div className="border border-border rounded-lg">
        <button
          type="button"
          onClick={() => toggleSection('shipping')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            <Icon name="Truck" size={18} className="text-primary" />
            <span className="font-medium text-foreground">Shipping & Delivery</span>
          </div>
          <Icon 
            name="ChevronDown" 
            size={18} 
            className={`transition-transform duration-200 ${expandedSections?.shipping ? 'rotate-180' : ''}`}
          />
        </button>
        
        {expandedSections?.shipping && (
          <div className="border-t border-border p-4 space-y-4">
            <Select
              label="Shipping Method"
              description="How will the item be delivered?"
              options={shippingOptions}
              value={formData?.shippingMethod}
              onChange={(value) => handleInputChange('shippingMethod', value)}
              error={errors?.shippingMethod}
              placeholder="Select shipping method"
            />

            {(formData?.shippingMethod === 'local' || formData?.shippingMethod === 'nationwide' || formData?.shippingMethod === 'both') && (
              <Input
                label="Shipping Cost (USD)"
                type="text"
                value={formData?.shippingCost}
                onChange={(e) => handleInputChange('shippingCost', formatCurrency(e?.target?.value))}
                placeholder="0.00"
                description="Leave blank if shipping is free"
              />
            )}

            <Input
              label="Item Location"
              type="text"
              value={formData?.itemLocation}
              onChange={(e) => handleInputChange('itemLocation', e?.target?.value)}
              placeholder="e.g., Orchard, Tampines, Jurong"
              description="General area for pickup/delivery reference"
            />
          </div>
        )}
      </div>
      {/* Return Policy */}
      <div className="border border-border rounded-lg">
        <button
          type="button"
          onClick={() => toggleSection('returns')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            <Icon name="RotateCcw" size={18} className="text-primary" />
            <span className="font-medium text-foreground">Return Policy</span>
          </div>
          <Icon 
            name="ChevronDown" 
            size={18} 
            className={`transition-transform duration-200 ${expandedSections?.returns ? 'rotate-180' : ''}`}
          />
        </button>
        
        {expandedSections?.returns && (
          <div className="border-t border-border p-4 space-y-4">
            <Select
              label="Return Policy"
              description="What's your return policy?"
              options={returnPolicyOptions}
              value={formData?.returnPolicy}
              onChange={(value) => handleInputChange('returnPolicy', value)}
              placeholder="Select return policy"
            />

            {formData?.returnPolicy !== 'no-returns' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Return Conditions
                </label>
                <textarea
                  value={formData?.returnConditions}
                  onChange={(e) => handleInputChange('returnConditions', e?.target?.value)}
                  placeholder="Specify conditions for returns (e.g., original packaging required, buyer pays return shipping, etc.)"
                  className="w-full min-h-20 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical text-foreground bg-input"
                  maxLength={500}
                />
                <p className="text-sm text-muted-foreground">
                  {formData?.returnConditions?.length || 0}/500 characters
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Buyer Requirements */}
      <div className="border border-border rounded-lg">
        <button
          type="button"
          onClick={() => toggleSection('requirements')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            <Icon name="Shield" size={18} className="text-primary" />
            <span className="font-medium text-foreground">Buyer Requirements</span>
          </div>
          <Icon 
            name="ChevronDown" 
            size={18} 
            className={`transition-transform duration-200 ${expandedSections?.requirements ? 'rotate-180' : ''}`}
          />
        </button>
        
        {expandedSections?.requirements && (
          <div className="border-t border-border p-4 space-y-4">
            <div className="space-y-3">
              <Checkbox
                label="Require verified phone number"
                description="Only buyers with verified phone numbers can bid"
                checked={formData?.requireVerifiedPhone}
                onChange={(e) => handleInputChange('requireVerifiedPhone', e?.target?.checked)}
              />

              <Checkbox
                label="Require minimum feedback score"
                description="Set a minimum rating requirement for bidders"
                checked={formData?.requireMinRating}
                onChange={(e) => handleInputChange('requireMinRating', e?.target?.checked)}
              />

              {formData?.requireMinRating && (
                <Input
                  label="Minimum Rating"
                  type="number"
                  value={formData?.minRating}
                  onChange={(e) => handleInputChange('minRating', e?.target?.value)}
                  min="1"
                  max="5"
                  step="0.1"
                  placeholder="4.0"
                  description="Minimum average rating (1.0 - 5.0)"
                />
              )}

              <Checkbox
                label="Block buyers with unpaid items"
                description="Prevent bidding from users with recent unpaid items"
                checked={formData?.blockUnpaidBuyers}
                onChange={(e) => handleInputChange('blockUnpaidBuyers', e?.target?.checked)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Additional Requirements
              </label>
              <textarea
                value={formData?.additionalRequirements}
                onChange={(e) => handleInputChange('additionalRequirements', e?.target?.value)}
                placeholder="Any additional requirements or instructions for bidders..."
                className="w-full min-h-20 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical text-foreground bg-input"
                maxLength={300}
              />
              <p className="text-sm text-muted-foreground">
                {formData?.additionalRequirements?.length || 0}/300 characters
              </p>
            </div>
          </div>
        )}
      </div>
      {/* Quick Setup Options */}
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <h4 className="font-medium text-foreground mb-3 flex items-center space-x-2">
          <Icon name="Zap" size={16} />
          <span>Quick Setup</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              handleInputChange('shippingMethod', 'pickup');
              handleInputChange('returnPolicy', 'no-returns');
              handleInputChange('requireVerifiedPhone', true);
            }}
            className="p-3 border border-border rounded-lg hover:bg-card transition-colors duration-200 text-left"
          >
            <div className="font-medium text-foreground">Local Pickup Only</div>
            <div className="text-sm text-muted-foreground">Pickup, no returns, verified phone required</div>
          </button>
          
          <button
            type="button"
            onClick={() => {
              handleInputChange('shippingMethod', 'both');
              handleInputChange('returnPolicy', '7-days');
              handleInputChange('requireVerifiedPhone', false);
            }}
            className="p-3 border border-border rounded-lg hover:bg-card transition-colors duration-200 text-left"
          >
            <div className="font-medium text-foreground">Flexible Options</div>
            <div className="text-sm text-muted-foreground">Pickup & delivery, 7-day returns</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuctionAdvancedOptions;