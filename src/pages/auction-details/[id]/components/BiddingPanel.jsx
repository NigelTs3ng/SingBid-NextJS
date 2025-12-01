import React, { useState, useEffect } from 'react';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Icon from '../../../../components/AppIcon';

const BiddingPanel = ({ auction, currentBid, onPlaceBid, isAuthenticated }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [bidError, setBidError] = useState('');

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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

  const handlePlaceBid = async () => {
    const error = validateBid(bidAmount);
    if (error) {
      setBidError(error);
      return;
    }

    setIsPlacingBid(true);
    try {
      await onPlaceBid(parseFloat(bidAmount));
      setBidAmount((parseFloat(bidAmount) + 1)?.toString());
    } catch (error) {
      setBidError('Failed to place bid. Please try again.');
    } finally {
      setIsPlacingBid(false);
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
      {isAuthenticated ? (
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
            iconName="Gavel"
            iconPosition="left"
          >
            {isPlacingBid ? 'Placing Bid...' : 'Place Bid'}
          </Button>

          {/* Security Notice */}
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Icon name="Shield" size={16} className="text-success mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Secure Bidding</p>
                <p>Your payment method will be pre-authorized. Funds are only captured if you win.</p>
              </div>
            </div>
          </div>
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