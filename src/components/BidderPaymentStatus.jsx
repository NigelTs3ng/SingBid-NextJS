import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import Icon from './AppIcon';

const BidderPaymentStatus = ({ auctionId, currentUser, refreshTrigger }) => {
  const [userBids, setUserBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && auctionId) {
      fetchUserBids();
    }
  }, [currentUser, auctionId, refreshTrigger]);

  const fetchUserBids = async () => {
    try {
      const response = await fetch(`/api/bids?auction_id=${auctionId}&user_id=${currentUser.id}`);
      if (response.ok) {
        const { bids } = await response.json();
        setUserBids(bids || []);
      }
    } catch (error) {
      console.error('Error fetching user bids:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price || 0);
  };

  const getStatusInfo = (bid) => {
    const { status, authorization_status, amount, payment_method, bidcoin_hold } = bid;
    
    if (payment_method === 'bidcoin') {
      if (status === 'active') {
        return {
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          icon: 'Coins',
          text: `${bidcoin_hold || 0} BidCoins HELD`,
          description: 'BidCoins reserved for this bid. They will be spent only if you win.'
        };
      }
      if (status === 'winning' && authorization_status === 'captured') {
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: 'Award',
          text: `${formatPrice(amount)} PAID WITH BIDCOINS`,
          description: 'You won! BidCoins have been used to pay for this auction.'
        };
      }
      if (status === 'outbid') {
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: 'RotateCcw',
          text: `${bidcoin_hold || 0} BidCoins RELEASED`,
          description: 'You were outbid. Your reserved BidCoins have been returned.'
        };
      }
    }
    
    if (status === 'active' && authorization_status === 'authorized') {
      return {
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        icon: 'CreditCard',
        text: `${formatPrice(amount)} HELD`,
        description: 'Payment authorized - funds held on your card'
      };
    }
    
    if (status === 'winning' && authorization_status === 'captured') {
      return {
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: 'CheckCircle',
        text: `${formatPrice(amount)} CHARGED`,
        description: 'You won! Payment captured - item is yours'
      };
    }
    
    if (status === 'outbid' && authorization_status === 'cancelled') {
      return {
        color: 'text-gray-600 bg-gray-50 border-gray-200',
        icon: 'XCircle',
        text: `${formatPrice(amount)} REFUNDED`,
        description: 'Outbid - payment authorization cancelled, funds released'
      };
    }
    
    if (status === 'cancelled') {
      return {
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: 'Ban',
        text: `${formatPrice(amount)} CANCELLED`,
        description: 'Auction cancelled - full refund processed'
      };
    }

    return {
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      icon: 'Clock',
      text: `${formatPrice(amount)} PENDING`,
      description: 'Bid processing...'
    };
  };

  if (!currentUser) return null;
  
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (userBids.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <Icon name="User" size={16} className="text-primary" />
        <h3 className="font-medium text-foreground">Your Bids & Payment Status</h3>
      </div>

      <div className="space-y-3">
        {userBids.map((bid) => {
          const statusInfo = getStatusInfo(bid);
          
          return (
            <div key={bid.id} className={`border rounded-lg p-3 ${statusInfo.color}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon name={statusInfo.icon} size={16} />
                  <span className="font-medium text-sm">{statusInfo.text}</span>
                </div>
                <span className="text-xs opacity-75">
                  {new Date(bid.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs mt-1 opacity-80">{statusInfo.description}</p>
              
              {/* Payment Identifiers */}
              {bid.payment_method === 'card' && bid.stripe_payment_intent_id && (
                <div className="mt-2 text-xs font-mono bg-black text-white px-2 py-1 rounded">
                  TEST: {bid.stripe_payment_intent_id.substring(0, 20)}...
                </div>
              )}
              {bid.payment_method === 'bidcoin' && (
                <div className="mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  BidCoins reserved: {bid.bidcoin_hold || 0}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Test Mode Help */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <Icon name="Info" size={16} className="text-yellow-600 mt-0.5" />
          <div className="text-xs text-yellow-800">
            <p className="font-medium mb-1">Testing Mode:</p>
            <p>• For card bids, check Stripe Dashboard → Payments for authorization status</p>
            <p>• Use test card 4242 4242 4242 4242 to simulate real payments</p>
            <p>• For BidCoin bids, balances update instantly when bids are placed or released</p>
            <p>• Payment IDs shown above are for verification in Stripe</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidderPaymentStatus;