import React, { useState, useEffect, useMemo } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Icon from '../../AppIcon';
import PaymentMethods from '../../PaymentMethods';
import { useBidcoins } from '../../../hooks/useBidcoins';

const BiddingPanel = ({ auction, currentBid, onPlaceBid, isAuthenticated, currentUser }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [bidError, setBidError] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentMode, setPaymentMode] = useState('card');
  const { data: bidcoinData, loading: bidcoinLoading, error: bidcoinError, refresh: refreshBidcoins } = useBidcoins();
  
  // Check if current user is the seller
  const isOwner = currentUser && auction && (currentUser.id === auction.seller_id || currentUser.id === auction.seller?.id);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(price);
  };

  // Calculate minimum bid with dynamic increment rules
  const calculateMinBid = (currentPrice) => {
    let increment = 1; // Default $1 increment
    
    if (currentPrice >= 100) increment = 5;   // $5 for auctions over $100
    if (currentPrice >= 500) increment = 10;  // $10 for auctions over $500
    if (currentPrice >= 1000) increment = 25; // $25 for auctions over $1000
    
    return currentPrice + increment;
  };
  
  const currentPrice = currentBid || auction?.starting_price || 0;
  const minBidAmount = calculateMinBid(currentPrice);

  useEffect(() => {
    setBidAmount(minBidAmount?.toString());
  }, [minBidAmount]);

  const coinsRequired = useMemo(() => {
    const numeric = parseFloat(bidAmount);
    if (isNaN(numeric)) return 0;
    return Math.round(numeric * 100);
  }, [bidAmount]);

  const bidcoinBalance = bidcoinData?.balance ?? 0;
  const hasEnoughBidcoins = paymentMode !== 'bidcoin' || bidcoinLoading || bidcoinBalance >= coinsRequired;
  const bidcoinUsdValue = (coinsRequired / 100).toFixed(2);

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

  useEffect(() => {
    if (paymentMode === 'bidcoin' && !bidcoinLoading && !bidcoinError && bidcoinBalance < coinsRequired) {
      setBidError(`Not enough BidCoins. You need ${coinsRequired} coins (≈ $${bidcoinUsdValue}).`);
    }
  }, [paymentMode, bidcoinLoading, bidcoinError, bidcoinBalance, coinsRequired, bidcoinUsdValue]);
  useEffect(() => {
    if (bidError && bidError.includes('BidCoins')) {
      if (paymentMode === 'card') {
        setBidError('');
      } else if (hasEnoughBidcoins && !bidcoinLoading && !bidcoinError) {
        setBidError('');
      }
    }
  }, [paymentMode, hasEnoughBidcoins, bidcoinLoading, bidcoinError, bidError]);

  const handleBidChange = (e) => {
    const value = e?.target?.value;
    setBidAmount(value);
    setBidError(validateBid(value));
  };

  useEffect(() => {
    if (paymentMode === 'bidcoin') {
      setSelectedPaymentMethod(null);
    }
  }, [paymentMode]);

  const handlePlaceBid = async () => {
    const error = validateBid(bidAmount);
    if (error) {
      setBidError(error);
      return;
    }
    
    if (paymentMode === 'card') {
      if (!selectedPaymentMethod) {
        setBidError('Please select a payment method to place your bid');
        return;
      }
    } else {
      if (bidcoinLoading) {
        setBidError('BidCoin balance is still loading. Please wait a moment.');
        return;
      }
      if (bidcoinError) {
        setBidError('Unable to load BidCoin balance. Please refresh and try again.');
        return;
      }
      if (!hasEnoughBidcoins) {
        setBidError(`Not enough BidCoins. You need ${coinsRequired} coins (≈ $${bidcoinUsdValue}).`);
        return;
      }
    }

    setIsPlacingBid(true);
    try {
      const result = await onPlaceBid(parseFloat(bidAmount), {
        type: paymentMode,
        paymentMethodId: paymentMode === 'card' ? selectedPaymentMethod : null
      });

      if (paymentMode === 'bidcoin') {
        refreshBidcoins().catch(() => {});
      }

      const basePrice = result?.new_current_price ?? parseFloat(bidAmount);
      if (!isNaN(basePrice)) {
        const nextMin = calculateMinBid(basePrice);
        setBidAmount(nextMin?.toString());
        setBidError('');
      }
    } catch (error) {
      // Extract specific error message from API response
      let errorMessage = 'Failed to place bid. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
        
        // Check for specific error patterns and provide user-friendly messages
        if (error.message.includes('Seller payment account not configured')) {
          errorMessage = 'Cannot place bid: The seller has not completed their payment setup. Please contact the seller or try another auction.';
        } else if (error.message.includes('Cannot place bid:')) {
          // Already user-friendly message from API
          errorMessage = error.message;
        } else if (error.message.includes('BidCoins')) {
          errorMessage = error.message;
        } else if (error.message.includes('Minimum bid increment')) {
          // Bid increment error is already user-friendly
          errorMessage = error.message;
        } else if (error.message.includes('Payment authorization failed')) {
          errorMessage = 'Your payment could not be authorized. Please check your payment method and try again.';
        } else if (error.message.includes('Auction has ended')) {
          errorMessage = 'This auction has ended. You cannot place new bids.';
        } else if (error.message.includes('Cannot bid on your own auction')) {
          errorMessage = 'You cannot bid on your own auction.';
        }
      }
      
      console.error('Bid error:', error.message);
      setBidError(errorMessage);
    } finally {
      setIsPlacingBid(false);
    }
  };

  // Generate quick bid amounts based on current price level
  const generateQuickBids = (minBid, currentPrice) => {
    const baseIncrement = minBid - currentPrice; // The minimum increment
    return [
      minBid,                           // Minimum bid
      minBid + baseIncrement * 2,       // 2x increment
      minBid + baseIncrement * 5,       // 5x increment  
      minBid + baseIncrement * 10       // 10x increment
    ];
  };
  
  const quickBidAmounts = generateQuickBids(minBidAmount, currentPrice);

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
      {/* Bidding Form */}
      {isOwner ? (
        // Owner Message - Sellers cannot bid on their own auction
        <div className="text-center space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <Icon name="User" size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground mb-2 font-medium">This is your auction</p>
            <p className="text-sm text-muted-foreground">You cannot bid on your own auction</p>
          </div>
        </div>
      ) : isAuthenticated ? (
        <div className="space-y-4">
          <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium text-foreground">Payment Preference</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={paymentMode === 'card' ? 'default' : 'outline'}
                size="sm"
                iconName="CreditCard"
                onClick={() => setPaymentMode('card')}
                disabled={isPlacingBid}
              >
                Card
              </Button>
              <Button
                variant={paymentMode === 'bidcoin' ? 'default' : 'outline'}
                size="sm"
                iconName="Coins"
                onClick={() => setPaymentMode('bidcoin')}
                disabled={isPlacingBid || !!bidcoinError}
              >
                BidCoins
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Balance:{' '}
                {bidcoinLoading
                  ? 'Loading…'
                  : `${bidcoinBalance} coins (≈ $${(bidcoinData?.usdValue ?? 0).toFixed(2)})`}
              </p>
              <p>
                Required for this bid: {coinsRequired} coins (≈ ${bidcoinUsdValue})
                {!hasEnoughBidcoins && paymentMode === 'bidcoin' && !bidcoinLoading && (
                  <span className="text-destructive ml-1">Insufficient balance</span>
                )}
              </p>
              {bidcoinError && (
                <p className="text-destructive">
                  Unable to load BidCoin balance right now. Try again shortly.
                </p>
              )}
            </div>
          </div>

          {paymentMode === 'card' && (
            <PaymentMethods
              onPaymentMethodSelected={setSelectedPaymentMethod}
              selectedPaymentMethod={selectedPaymentMethod}
            />
          )}

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

          <Button
            variant="default"
            fullWidth
            loading={isPlacingBid}
            disabled={
              !!bidError ||
              !bidAmount ||
              isPlacingBid ||
              (paymentMode === 'card' && !selectedPaymentMethod)
            }
            onClick={handlePlaceBid}
            iconName="Gavel"
            iconPosition="left"
          >
            {isPlacingBid
              ? 'Authorizing Bid...'
              : paymentMode === 'bidcoin'
              ? 'Place Bid with BidCoins'
              : 'Place Bid'}
          </Button>

          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Icon name="Shield" size={16} className="text-success mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Secure Bidding</p>
                <p>
                  {paymentMode === 'bidcoin'
                    ? 'BidCoins are reserved when you bid and only spent if you win.'
                    : 'Your card is pre-authorized now and charged only if you win.'}
                </p>
              </div>
            </div>
          </div>

          {bidError && (
            <div className="text-sm text-destructive">
              {bidError}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <Icon name="Lock" size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground mb-4">Sign in to place bids</p>
            <Button
              variant="default"
              fullWidth
              onClick={() => window.location.href = '/login'}
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
  );
};

export default BiddingPanel;