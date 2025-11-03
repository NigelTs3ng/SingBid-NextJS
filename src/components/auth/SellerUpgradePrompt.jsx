"use client";
import React from 'react';
import { useRouter } from 'next/router';
import Button from '../ui/Button';
import Icon from '../AppIcon';

const SellerUpgradePrompt = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="Crown" size={32} className="text-orange-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Seller Account Required
        </h1>
        
        <p className="text-muted-foreground mb-6 leading-relaxed">
          To create auctions and sell items on BidWin, you need to upgrade to a seller account. 
          This helps us maintain a safe and trusted marketplace for all users.
        </p>

        <div className="bg-muted rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-foreground mb-3">Seller Benefits:</h3>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-center space-x-2">
              <Icon name="Check" size={16} className="text-green-600" />
              <span>Create unlimited auctions</span>
            </li>
            <li className="flex items-center space-x-2">
              <Icon name="Check" size={16} className="text-green-600" />
              <span>Access to seller analytics</span>
            </li>
            <li className="flex items-center space-x-2">
              <Icon name="Check" size={16} className="text-green-600" />
              <span>Priority customer support</span>
            </li>
            <li className="flex items-center space-x-2">
              <Icon name="Check" size={16} className="text-green-600" />
              <span>Advanced selling tools</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            fullWidth
            size="lg"
            onClick={() => router.push('/seller/setup')}
            iconName="ArrowRight"
            iconPosition="right"
          >
            Upgrade to Seller Account
          </Button>
          
          <Button
            variant="outline"
            fullWidth
            onClick={() => router.push('/home-page')}
            iconName="Home"
            iconPosition="left"
          >
            Back to Home
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Upgrading to a seller account is free and takes just a few minutes to complete.
        </p>
      </div>
    </div>
  );
};

export default SellerUpgradePrompt;