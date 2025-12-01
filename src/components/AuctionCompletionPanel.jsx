import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import Icon from './AppIcon';

const AuctionCompletionPanel = ({ auction, currentUser, onAuctionCompleted, onNotify }) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  
  // Force re-render when auction status changes
  useEffect(() => {
    setForceRender(prev => prev + 1);
  }, [auction?.status, auction?.id]);

  // Check if current user is the seller
  const isOwner = currentUser && auction && (
    currentUser.id === auction.seller_id || 
    currentUser.id === auction.seller?.id
  );

  // Don't show if not the owner
  if (!isOwner) return null;

  // Check auction status
  const now = new Date();
  const endTime = new Date(auction.end_time);
  const hasEnded = now >= endTime;
  const isActive = auction.status === 'active';
  const isCompleted = auction.status === 'completed' || auction.status === 'ended';
  // Check if there are bids by comparing current price to starting price
  // If current_price > starting_price, there must be bids
  const hasBids = auction.current_price > auction.starting_price;
  
  // Debug logging
  console.log('AuctionCompletionPanel status check:', {
    auction_id: auction.id,
    auction_status: auction.status,
    isActive,
    isCompleted,
    hasBids,
    shouldShow: isOwner && !isCompleted && isActive
  });
  

  // Don't show if already completed
  if (isCompleted) {
    console.log('Hiding completion panel - auction is completed');
    return null;
  }

  // Allow sellers to complete active auctions early
  // Only hide if auction is not active (e.g., already ended, cancelled, etc.)
  if (!isActive) {
    console.log('Hiding completion panel - auction is not active');
    return null;
  }
  
  // Additional safety check - if auction status is anything other than active, hide
  if (auction.status !== 'active') {
    console.log('Hiding completion panel - auction status is:', auction.status);
    return null;
  }

  const handleCompleteClick = () => {
    setShowCompletionConfirm(true);
  };

  const handleCompleteConfirm = async () => {
    setIsCompleting(true);
    
    try {
      const response = await fetch(`/api/auctions/${auction.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete auction');
      }

      // Success - close modal immediately
      setShowCompletionConfirm(false);
      setIsCompleting(false);
      
      // Notify parent component FIRST to update UI
      onAuctionCompleted?.(result);
      onNotify?.({
        type: 'success',
        message: result.message || 'Auction completed successfully!'
      });

    } catch (error) {
      console.error('Completion error:', error);
      onNotify?.({
        type: 'error',
        message: `Failed to complete auction: ${error.message}`
      });
      // Only reset on error since success case handles it immediately
      setIsCompleting(false);
      setShowCompletionConfirm(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price || 0);
  };

  const calculateFees = () => {
    const currentPrice = auction.current_price || 0;
    const platformFee = currentPrice * 0.05;
    const sellerAmount = currentPrice - platformFee;
    
    return { platformFee, sellerAmount };
  };

  const { platformFee, sellerAmount } = calculateFees();

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <Icon name="CheckCircle" size={16} className="text-green-600" />
        <h3 className="font-medium text-green-900">Complete Auction</h3>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-green-700 font-medium">Status:</span>
            <span className="ml-2 text-green-800">
              {hasEnded 
                ? 'Time Expired' 
                : hasBids 
                ? 'Active with Bids' 
                : 'Active - End Early'
              }
            </span>
          </div>
          <div>
            <span className="text-green-700 font-medium">Highest Bid:</span>
            <span className="ml-2 text-green-800 font-semibold">
              {formatPrice(auction.current_price)}
            </span>
          </div>
        </div>

        {hasBids && (
          <div className="bg-white border border-green-200 rounded-lg p-3">
            <h4 className="font-medium text-green-900 mb-2">Payment Breakdown:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Winning Bid:</span>
                <span className="text-green-800">{formatPrice(auction.current_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Platform Fee (5%):</span>
                <span className="text-red-600">-{formatPrice(platformFee)}</span>
              </div>
              <div className="border-t border-green-200 pt-1 flex justify-between font-semibold">
                <span className="text-green-800">You'll Receive:</span>
                <span className="text-green-900">{formatPrice(sellerAmount)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleCompleteClick}
            iconName={hasEnded || hasBids ? "Gavel" : "Square"}
            iconPosition="left"
            className="bg-green-600 hover:bg-green-700"
          >
            {hasEnded || hasBids ? 'Complete Auction' : 'End Auction Early'}
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Icon name="Info" size={16} className="text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">
                {hasBids ? 'What happens when you complete:' : 'What happens when you end early:'}
              </p>
              <ul className="list-disc list-inside space-y-1">
                {hasBids ? (
                  <>
                    <li>Winner's payment will be captured (charged)</li>
                    <li>Other bidders will be refunded immediately</li>
                    <li>You'll receive {formatPrice(sellerAmount)} to your bank account</li>
                    <li>Platform keeps {formatPrice(platformFee)} as service fee</li>
                  </>
                ) : (
                  <>
                    <li>Auction will be ended immediately</li>
                    <li>No payments will be processed (no bids placed)</li>
                    <li>Auction status will be marked as "ended"</li>
                    <li>You can create a new auction if needed</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Confirmation Modal */}
      {showCompletionConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <Icon name="CheckCircle" size={20} className="text-green-500" />
              <h3 className="text-lg font-semibold text-foreground">Complete Auction</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-slate-700">
                {hasBids 
                  ? 'Ready to complete this auction and process payments?' 
                  : 'Ready to end this auction early? No payments will be processed since there are no bids.'}
              </p>
              
              {hasBids && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm text-green-800">
                    <div className="flex justify-between mb-2">
                      <span>Winning Bid:</span>
                      <span className="font-semibold">{formatPrice(auction.current_price)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Platform Fee:</span>
                      <span>-{formatPrice(platformFee)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-green-300 pt-2">
                      <span>You'll Receive:</span>
                      <span className="text-green-900">{formatPrice(sellerAmount)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCompletionConfirm(false)}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleCompleteConfirm}
                  loading={isCompleting}
                  fullWidth
                  iconName="CheckCircle"
                  iconPosition="left"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isCompleting 
                    ? 'Processing...' 
                    : hasBids 
                    ? 'Complete Auction' 
                    : 'End Auction Early'
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionCompletionPanel;