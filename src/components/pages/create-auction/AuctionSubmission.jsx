import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const AuctionSubmission = ({ 
  formData, 
  images, 
  onSubmit, 
  isSubmitting, 
  errors 
}) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToFees, setAgreedToFees] = useState(false);

  const calculateFees = () => {
    const reservePrice = parseFloat(formData?.reservePrice || 0);
    const platformFee = reservePrice * 0.05; // 5% platform fee
    const youReceive = reservePrice - platformFee;
    
    return {
      reservePrice,
      platformFee,
      youReceive
    };
  };

  const fees = calculateFees();

  const validateForm = () => {
    const validationErrors = [];

    if (!formData?.title?.trim()) {
      validationErrors?.push('Auction title is required');
    }

    if (!formData?.description?.trim()) {
      validationErrors?.push('Description is required');
    }

    if (!formData?.category) {
      validationErrors?.push('Category selection is required');
    }

    if (!formData?.condition) {
      validationErrors?.push('Item condition is required');
    }

    if (!formData?.reservePrice || parseFloat(formData?.reservePrice) <= 0) {
      validationErrors?.push('Valid reserve price is required');
    }

    if (!formData?.startDate) {
      validationErrors?.push('Start date is required');
    }

    if (!formData?.startTime) {
      validationErrors?.push('Start time is required');
    }

    if (!formData?.duration) {
      validationErrors?.push('Auction duration is required');
    }

    if (images?.length === 0) {
      validationErrors?.push('At least one image is required');
    }

    if (!agreedToTerms) {
      validationErrors?.push('You must agree to the terms and conditions');
    }

    if (!agreedToFees) {
      validationErrors?.push('You must acknowledge the fee structure');
    }

    return validationErrors;
  };

  const handleSubmit = () => {
    const validationErrors = validateForm();
    
    if (validationErrors?.length > 0) {
      // Show validation errors
      console.error('Validation errors:', validationErrors);
      return;
    }

    onSubmit();
  };

  const getCompletionPercentage = () => {
    const requiredFields = [
      formData?.title,
      formData?.description,
      formData?.category,
      formData?.condition,
      formData?.reservePrice,
      formData?.startDate,
      formData?.startTime,
      formData?.duration,
      images?.length > 0
    ];

    const completedFields = requiredFields?.filter(Boolean)?.length;
    return Math.round((completedFields / requiredFields?.length) * 100);
  };

  const completionPercentage = getCompletionPercentage();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Icon name="CheckCircle" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Review & Submit</h3>
      </div>
      {/* Completion Status */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-foreground">Form Completion</span>
          <span className="text-sm font-semibold text-primary">{completionPercentage}%</span>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2 mb-3">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {completionPercentage < 100 && (
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Please complete the following required fields:</p>
            <ul className="space-y-1">
              {!formData?.title && <li>â€¢ Auction title</li>}
              {!formData?.description && <li>â€¢ Item description</li>}
              {!formData?.category && <li>â€¢ Category selection</li>}
              {!formData?.condition && <li>â€¢ Item condition</li>}
              {!formData?.reservePrice && <li>â€¢ Reserve price</li>}
              {!formData?.startDate && <li>â€¢ Start date</li>}
              {!formData?.startTime && <li>â€¢ Start time</li>}
              {!formData?.duration && <li>â€¢ Auction duration</li>}
              {images?.length === 0 && <li>â€¢ At least one image</li>}
            </ul>
          </div>
        )}
      </div>
      {/* Fee Breakdown */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="font-semibold text-foreground mb-4 flex items-center space-x-2">
          <Icon name="Calculator" size={16} />
          <span>Fee Breakdown</span>
        </h4>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Reserve Price:</span>
            <span className="font-semibold text-foreground">
              S${fees?.reservePrice?.toLocaleString('en-SG', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Platform Fee (5%):</span>
            <span className="text-error">
              -S${fees?.platformFee?.toLocaleString('en-SG', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="border-t border-border pt-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">You'll Receive:</span>
              <span className="font-bold text-success text-lg">
                S${fees?.youReceive?.toLocaleString('en-SG', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <Icon name="Info" size={14} className="inline mr-1" />
            Premium subscribers enjoy reduced platform fees. 
            <button className="underline hover:no-underline ml-1">
              Upgrade now
            </button>
          </p>
        </div>
      </div>
      {/* Terms and Agreements */}
      <div className="space-y-4">
        <Checkbox
          label="I agree to the Terms and Conditions"
          description="I have read and agree to BidWin's terms of service, auction policies, and user agreement"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e?.target?.checked)}
          error={!agreedToTerms && errors?.terms ? 'You must agree to the terms and conditions' : ''}
        />

        <Checkbox
          label="I acknowledge the fee structure"
          description="I understand that a 5% platform fee will be deducted from the final sale price, and funds will be held for 5 days after auction completion"
          checked={agreedToFees}
          onChange={(e) => setAgreedToFees(e?.target?.checked)}
          error={!agreedToFees && errors?.fees ? 'You must acknowledge the fee structure' : ''}
        />
      </div>
      {/* Important Notes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Icon name="AlertTriangle" size={16} className="text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900 mb-2">Important Notes</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>â€¢ Once published, auction details cannot be modified</li>
              <li>â€¢ You are legally bound to sell if reserve price is met</li>
              <li>â€¢ Payment will be processed automatically upon auction completion</li>
              <li>â€¢ Funds are held for 5 days to allow for buyer confirmation</li>
              <li>â€¢ False or misleading information may result in account suspension</li>
            </ul>
          </div>
        </div>
      </div>
      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="outline"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          iconName="ArrowUp"
          iconPosition="left"
          className="sm:w-auto"
        >
          Review Details
        </Button>
        
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={completionPercentage < 100 || !agreedToTerms || !agreedToFees || isSubmitting}
          loading={isSubmitting}
          iconName="Send"
          iconPosition="right"
          fullWidth
        >
          {isSubmitting ? 'Publishing Auction...' : 'Publish Auction'}
        </Button>
      </div>
      {/* Success Message Preview */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Icon name="CheckCircle" size={16} className="text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-900 mb-1">After Submission</h4>
            <p className="text-sm text-green-800">
              Your auction will be reviewed and published within 15 minutes. You'll receive a confirmation email with your auction link and management options.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionSubmission;