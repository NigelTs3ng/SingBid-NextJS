import React from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const AuctionBasicDetails = ({ 
  formData, 
  onFormDataChange, 
  errors 
}) => {
  const categoryOptions = [
    { value: 'electronics', label: 'Electronics & Gadgets' },
    { value: 'fashion', label: 'Fashion & Accessories' },
    { value: 'home', label: 'Home & Garden' },
    { value: 'collectibles', label: 'Collectibles & Antiques' },
    { value: 'books', label: 'Books & Media' },
    { value: 'sports', label: 'Sports & Recreation' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'art', label: 'Art & Crafts' },
    { value: 'jewelry', label: 'Jewelry & Watches' },
    { value: 'toys', label: 'Toys & Games' },
    { value: 'music', label: 'Musical Instruments' },
    { value: 'other', label: 'Other' }
  ];

  const conditionOptions = [
    { value: 'new', label: 'Brand New', description: 'Never used, in original packaging' },
    { value: 'like-new', label: 'Like New', description: 'Barely used, excellent condition' },
    { value: 'good', label: 'Good', description: 'Used with minor signs of wear' },
    { value: 'fair', label: 'Fair', description: 'Used with noticeable wear but functional' },
    { value: 'poor', label: 'Poor', description: 'Heavy wear, may need repairs' }
  ];

  const handleInputChange = (field, value) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };

  const formatCurrency = (value) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value?.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = numericValue?.split('.');
    if (parts?.length > 2) {
      return parts?.[0] + '.' + parts?.slice(1)?.join('');
    }
    
    return numericValue;
  };

  const handleReservePriceChange = (e) => {
    const formatted = formatCurrency(e?.target?.value);
    handleInputChange('reservePrice', formatted);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Icon name="Package" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Basic Details</h3>
      </div>
      {/* Auction Title */}
      <Input
        label="Auction Title"
        type="text"
        value={formData?.title}
        onChange={(e) => handleInputChange('title', e?.target?.value)}
        placeholder="Enter a descriptive title for your auction"
        error={errors?.title}
        required
        maxLength={100}
        description={`${formData?.title?.length}/100 characters`}
      />
      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Description <span className="text-error">*</span>
        </label>
        <textarea
          value={formData?.description}
          onChange={(e) => handleInputChange('description', e?.target?.value)}
          placeholder={`Provide detailed information about your item including:\n• Condition and age\n• Brand and model\n• Dimensions or specifications\n• Any defects or issues\n• Reason for selling`}
          className="w-full min-h-32 px-3 py-2 border-2 border-slate-200 hover:border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 resize-vertical text-slate-900 bg-white placeholder:text-slate-400 transition-all duration-200"
          maxLength={2000}
        />
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Be detailed and honest to build buyer confidence
          </p>
          <span className="text-sm text-muted-foreground">
            {formData?.description?.length}/2000
          </span>
        </div>
        {errors?.description && (
          <p className="text-sm text-error flex items-center space-x-1">
            <Icon name="AlertCircle" size={14} />
            <span>{errors?.description}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category */}
        <Select
          label="Category"
          description="Choose the most relevant category"
          options={categoryOptions}
          value={formData?.category}
          onChange={(value) => handleInputChange('category', value)}
          error={errors?.category}
          required
          placeholder="Select category"
          searchable
        />

        {/* Condition */}
        <Select
          label="Item Condition"
          description="Be honest about the item's condition"
          options={conditionOptions}
          value={formData?.condition}
          onChange={(value) => handleInputChange('condition', value)}
          error={errors?.condition}
          required
          placeholder="Select condition"
        />
      </div>
      {/* Reserve Price */}
      <div className="space-y-2">
        <Input
          label="Reserve Price (USD)"
          type="text"
          value={formData?.reservePrice}
          onChange={handleReservePriceChange}
          placeholder="0.00"
          error={errors?.reservePrice}
          required
          description="Minimum price you're willing to accept"
        />
        
        {formData?.reservePrice && (
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reserve Price:</span>
              <span className="font-semibold text-foreground">
                ${parseFloat(formData?.reservePrice || 0)?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Platform Fee (5%):</span>
              <span className="text-muted-foreground">
                ${(parseFloat(formData?.reservePrice || 0) * 0.05)?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="border-t border-border mt-2 pt-2 flex items-center justify-between text-sm font-semibold">
              <span className="text-foreground">You'll receive:</span>
              <span className="text-success">
                ${(parseFloat(formData?.reservePrice || 0) * 0.95)?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>
      {/* Additional Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Icon name="Lightbulb" size={16} className="text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Tips for Better Listings</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use specific keywords in your title for better searchability</li>
              <li>• Include brand names, model numbers, and key features</li>
              <li>• Set a competitive reserve price based on market research</li>
              <li>• Mention any included accessories or warranties</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionBasicDetails;