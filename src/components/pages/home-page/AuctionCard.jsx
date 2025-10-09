import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { realtimeService } from '../../../lib/services';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const AuctionCard = ({ auction, viewMode = 'grid', onAuctionUpdate }) => {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(auction?.timeRemaining);
  const [isWatching, setIsWatching] = useState(false);
  const [currentBid, setCurrentBid] = useState(auction?.currentBid);
  const [totalBids, setTotalBids] = useState(auction?.totalBids);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        const { hours, minutes, seconds } = prevTime;
        let totalSeconds = hours * 3600 + minutes * 60 + seconds - 1;
        
        if (totalSeconds < 0) totalSeconds = 0;
        
        return {
          hours: Math.floor(totalSeconds / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Polling for auction updates when realtime is disabled
  useEffect(() => {
    let pollInterval;
    
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const updates = await realtimeService.pollAuctionUpdates(auction.id);
          if (updates && updates.length > 0) {
            // Update local state with new bid data
            const latestBid = updates[0];
            if (latestBid.amount > currentBid) {
              setCurrentBid(latestBid.amount);
              setTotalBids(prev => prev + updates.length);
              
              // Notify parent component if callback provided
              if (onAuctionUpdate) {
                onAuctionUpdate(auction.id, { 
                  currentBid: latestBid.amount, 
                  totalBids: totalBids + updates.length 
                });
              }
            }
          }
        } catch (error) {
          console.error('Error polling auction updates:', error);
        }
      }, 10000); // Poll every 10 seconds
    };

    // Start polling for this specific auction
    startPolling();

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [auction.id, currentBid, totalBids, onAuctionUpdate]);

  const formatTime = (time) => {
    return time < 10 ? `0${time}` : time;
  };

  const getTimeColor = () => {
    const totalMinutes = timeLeft?.hours * 60 + timeLeft?.minutes;
    if (totalMinutes < 60) return 'text-error';
    if (totalMinutes < 360) return 'text-warning';
    return 'text-success';
  };

  const handleCardClick = () => {
    router.push(`/auction-details/${auction.id}`);
  };

  const handleBidNow = (e) => {
    e.stopPropagation();
    router.push(`/auction-details/${auction.id}?action=bid`);
  };

  const handleWatchClick = (e) => {
    e?.stopPropagation();
    setIsWatching(!isWatching);
  };

  const calculateNextBidAmount = () => {
    const increment = currentBid < 100 ? 5 : 
                     currentBid < 500 ? 10 : 
                     currentBid < 1000 ? 25 : 50;
    return currentBid + increment;
  };

  return (
    <div 
      className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <div className="relative h-40 sm:h-48 overflow-hidden">
        <Image
          src={auction?.image}
          alt={auction?.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Watch Button */}
        <button
          onClick={handleWatchClick}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
            isWatching 
              ? 'bg-error/90 text-white shadow-lg'
              : 'bg-black/50 backdrop-blur-sm text-white hover:bg-black/70'
          }`}
        >
          <Icon name="Heart" size={16} className={isWatching ? 'fill-current' : ''} />
        </button>

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          {auction?.category && (
            <div className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full">
              {auction?.category}
            </div>
          )}
        </div>

        {/* Time Remaining */}
        <div className="absolute bottom-3 left-3 right-12">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Icon name="Clock" size={12} className="text-white" />
                <span className="text-white text-xs font-medium">
                  {formatTime(timeLeft?.hours)}:{formatTime(timeLeft?.minutes)}:{formatTime(timeLeft?.seconds)}
                </span>
              </div>
              <span className={`text-xs font-medium ${getTimeColor()}`}>
                {timeLeft?.hours === 0 && timeLeft?.minutes < 60 ? 'Ending Soon!' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-foreground text-base sm:text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {auction?.title}
        </h3>

        {/* Seller Info */}
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
            <Icon name="User" size={10} color="white" />
          </div>
          <span className="text-xs text-muted-foreground">{auction?.seller?.name}</span>
          {auction?.seller?.verified && (
            <Icon name="BadgeCheck" size={12} className="text-primary" />
          )}
          <div className="flex items-center space-x-1">
            <Icon name="Star" size={10} className="text-yellow-400" />
            <span className="text-xs text-muted-foreground">{auction?.seller?.rating}</span>
          </div>
        </div>

        {/* Bid Information - Use local state for real-time updates */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-muted-foreground">Current Bid</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              S${currentBid?.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total Bids</div>
            <div className="text-base sm:text-lg font-semibold text-primary">
              {totalBids}
            </div>
          </div>
        </div>

        {/* Reserve Price Indicator */}
        <div className="mb-3">
          {currentBid >= auction?.reservePrice ? (
            <div className="flex items-center space-x-1.5">
              <Icon name="CheckCircle" size={14} className="text-success" />
              <span className="text-xs font-medium text-success">Reserve Met</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              <Icon name="AlertCircle" size={14} className="text-warning" />
              <span className="text-xs text-warning">Reserve: S${auction?.reservePrice?.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleBidNow}
            iconName="Gavel"
            iconPosition="left"
            className="flex-1 text-sm"
          >
            Bid S${calculateNextBidAmount()?.toLocaleString()}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            iconName="Eye"
            className="px-3"
          />
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Icon name="MapPin" size={10} />
              <span>Singapore</span>
            </div>
            <div className="flex items-center space-x-1">
              <Icon name="Eye" size={10} />
              <span>{auction?.views || 0}</span>
            </div>
          </div>
          
          {auction?.shippingIncluded && (
            <div className="flex items-center space-x-1 text-xs text-success">
              <Icon name="Truck" size={10} />
              <span>Free Shipping</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuctionCard;