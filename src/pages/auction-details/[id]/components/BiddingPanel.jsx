import React, { useState, useEffect } from 'react';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Icon from '../../../../components/AppIcon';
import Modal from '../../../../components/ui/Modal';
import { useAuth } from '../../../../contexts/AuthContext';

const BiddingPanel = ({ auction, currentBid, onPlaceBid, isAuthenticated }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [bidError, setBidError] = useState('');
  const [showSelfBidModal, setShowSelfBidModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [preAuthStatus, setPreAuthStatus] = useState(null);
  const [paymentMethodId, setPaymentMethodId] = useState(null);
  const { user } = useAuth();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
    })?.format(price);
  };

  const minBidAmount = currentBid ? currentBid + 1 : auction?.startingPrice;

  useEffect(() => {
    setBidAmount(minBidAmount?.toString());
  }, [minBidAmount]);

  const validateBid = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return 'Please enter a valid amount';
    }
    if (numAmount < minBidAmount) {
      return `Bid must be at least ${formatPrice(minBidAmount)}`;
    }
    if (numAmount > 999999) {
      return 'Bid amount too high';
    }
    return '';
  };

  const handleBidChange = (e) => {
    const value = e?.target?.value;
    setBidAmount(value);
    setBidError(validateBid(value));
  };

  const checkSelfBidding = () => {
    if (!user?.id || !auction?.seller?.id) {
      return false;
    }
    return user.id === auction.seller.id;
  };

  // Step 1: Validate bid and show payment modal
  const handlePlaceBid = async () => {
    console.log('🎯 BIDDING PANEL - handlePlaceBid called!');
    
    // Check for self-bidding first
    if (checkSelfBidding()) {
      console.log('🚫 Self-bidding attempt detected, showing modal');
      setShowSelfBidModal(true);
      return;
    }
    
    const error = validateBid(bidAmount);
    if (error) {
      console.log('❌ Bid validation failed:', error);
      setBidError(error);
      return;
    }

    // Show payment method selection modal
    setShowPaymentModal(true);
  };

  // Step 2: Pre-authorize payment method
  const handlePreAuthorizePayment = async (selectedPaymentMethodId) => {
    setIsPlacingBid(true);
    try {
      console.log('🔐 Starting pre-authorization process...');
      
      const response = await fetch('/api/bids/pre-authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId: auction.id,
          bidAmount: parseFloat(bidAmount),
          paymentMethodId: selectedPaymentMethodId,
          bidderId: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Pre-authorization failed');
      }

      if (result.requiresAction) {
        // Handle 3D Secure or other authentication
        setBidError('Payment authentication required. Please complete the verification.');
        setShowPaymentModal(false);
        return;
      }

      if (result.success) {
        console.log('✅ Pre-authorization successful:', result);
        setPreAuthStatus(result.preAuthorization);
        setPaymentMethodId(selectedPaymentMethodId);
        setShowPaymentModal(false);
        
        // Now place the actual bid
        await handleConfirmBid(result.preAuthorization.id);
      }

    } catch (error) {
      console.error('❌ Pre-authorization failed:', error);
      setBidError(error.message || 'Pre-authorization failed. Please try again.');
      setShowPaymentModal(false);
    } finally {
      setIsPlacingBid(false);
    }
  };

  // Step 3: Place the bid with pre-authorization
  const handleConfirmBid = async (preAuthId) => {
    try {
      console.log('🎯 Placing bid with pre-auth:', preAuthId);
      
      const response = await fetch('/api/bids/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId: auction.id,
          bidAmount: parseFloat(bidAmount),
          preAuthId: preAuthId,
          bidderId: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to place bid');
      }

      console.log('✅ Bid placed successfully:', result);
      
      // Update local state
      setBidAmount((parseFloat(bidAmount) + 1)?.toString());
      setBidError('');
      
      // Notify parent component
      if (onPlaceBid) {
        await onPlaceBid(parseFloat(bidAmount));
      }

    } catch (error) {
      console.error('❌ Bid placement failed:', error);
      setBidError(error.message || 'Failed to place bid. Please try again.');
    }
  };

  const quickBidAmounts = [
    minBidAmount + 5,
    minBidAmount + 10,
    minBidAmount + 25,
    minBidAmount + 50
  ];

  if (auction?.status === 'ended') {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center">
          <Icon name="Gavel" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold text-muted-foreground mb-2">Auction Ended</h3>
          <p className="text-muted-foreground">
            {auction?.winner ? `Won by ${auction?.winner}` : 'No winner'}
          </p>
          {currentBid && (
            <p className="text-lg font-semibold mt-2">
              Final Bid: {formatPrice(currentBid)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        {/* Current Bid Display */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Icon name="TrendingUp" size={20} className="text-success" />
            <span className="text-sm font-medium text-muted-foreground">Current Highest Bid</span>
          </div>
          <div className="text-3xl font-bold text-foreground">
            {currentBid ? formatPrice(currentBid) : formatPrice(auction?.startingPrice)}
          </div>
          {!currentBid && (
            <p className="text-sm text-muted-foreground mt-1">Starting price - No bids yet</p>
          )}
        </div>

        {/* Pre-auth Status Indicator */}
        {preAuthStatus && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Icon name="Shield" size={16} className="text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Funds Pre-authorized: {formatPrice(preAuthStatus.amount)}
              </span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Your payment method has been verified and funds are reserved.
            </p>
          </div>
        )}

        {/* Bidding Form */}
        {isAuthenticated ? (
          <>
            {/* Check if user is the seller */}
            {checkSelfBidding() ? (
              <div className="text-center space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Icon name="User" size={20} className="text-yellow-600" />
                    <span className="font-medium text-yellow-800">Your Auction</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    You cannot bid on your own auction. Share this auction with others to get bids!
                  </p>
                </div>
                
                {/* Share Options */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Share your auction:</p>
                  <div className="flex justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: auction.title,
                            text: `Check out this auction: ${auction.title}`,
                            url: window.location.href
                          });
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                        }
                      }}
                      iconName="Share"
                      iconPosition="left"
                    >
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                      }}
                      iconName="Copy"
                      iconPosition="left"
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Input
                    label="Your Bid Amount"
                    type="number"
                    value={bidAmount}
                    onChange={handleBidChange}
                    error={bidError}
                    placeholder={`Minimum ${formatPrice(minBidAmount)}`}
                    min={minBidAmount}
                    step="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum bid: {formatPrice(minBidAmount)}
                  </p>
                </div>

                {/* Quick Bid Buttons */}
                <div>
                  <p className="text-sm font-medium mb-2">Quick Bid:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickBidAmounts?.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBidAmount(amount?.toString());
                          setBidError('');
                        }}
                        className="text-sm"
                      >
                        {formatPrice(amount)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Place Bid Button */}
                <Button
                  variant="default"
                  fullWidth
                  loading={isPlacingBid}
                  disabled={!!bidError || !bidAmount || isPlacingBid}
                  onClick={handlePlaceBid}
                  iconName="CreditCard"
                  iconPosition="left"
                >
                  {isPlacingBid ? 'Processing...' : 'Pre-authorize & Bid'}
                </Button>

                {/* Security Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Icon name="Shield" size={16} className="text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-800">
                      <p className="font-medium mb-1">Secure Pre-authorization</p>
                      <p>We'll verify your payment method and reserve funds. No charge until you win.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <Icon name="Lock" size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground mb-4">Sign in to place bids</p>
              <Button
                variant="default"
                fullWidth
                onClick={() => window.location.href = '/auth/signin'}
              >
                Sign In to Bid
              </Button>
            </div>
          </div>
        )}

        {/* Bid Statistics */}
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-foreground">{auction?.totalBids}</div>
              <div className="text-xs text-muted-foreground">Total Bids</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">{auction?.watchers || 0}</div>
              <div className="text-xs text-muted-foreground">Watchers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Self-Bidding Prevention Modal */}
      <Modal
        isOpen={showSelfBidModal}
        onClose={() => setShowSelfBidModal(false)}
        title="Cannot Bid on Your Own Auction"
        type="warning"
        size="md"
        actions={
          <Button
            variant="default"
            onClick={() => setShowSelfBidModal(false)}
          >
            Got it
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            You cannot place bids on your own auction. This ensures fair competition and maintains 
            the integrity of the bidding process.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Icon name="Lightbulb" size={16} className="text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Tip</p>
                <p className="text-sm text-blue-800">
                  Share your auction with friends, family, or social media to attract more bidders!
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: auction.title,
                    text: `Check out this auction: ${auction.title}`,
                    url: window.location.href
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
                setShowSelfBidModal(false);
              }}
              iconName="Share"
              iconPosition="left"
            >
              Share Auction
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setShowSelfBidModal(false);
              }}
              iconName="Copy"
              iconPosition="left"
            >
              Copy Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Method Selection Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Select Payment Method"
        type="info"
        size="md"
        showCloseButton={true}
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={16} className="text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 mb-1">Pre-authorization Required</p>
                <p className="text-sm text-yellow-700">
                  We'll verify your payment method and reserve {formatPrice(parseFloat(bidAmount))} to ensure you can pay if you win. No charge until auction ends.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Choose Payment Method:</h4>
            
            {/* Credit Card Option */}
            <Button
              variant="outline"
              fullWidth
              onClick={() => handlePreAuthorizePayment('pm_card_visa')} // Use test payment method
              iconName="CreditCard"
              iconPosition="left"
              loading={isPlacingBid}
              disabled={isPlacingBid}
            >
              Credit/Debit Card
            </Button>

            {/* Add more payment methods here in the future */}
          </div>

          <div className="text-xs text-muted-foreground">
            <p>💡 Your card will be pre-authorized but not charged until you win the auction.</p>
            <p>🔒 All payments are processed securely through Stripe.</p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BiddingPanel;