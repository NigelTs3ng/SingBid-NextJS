import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const AuctionCard = ({ auction, viewMode = 'grid' }) => {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endTime = new Date(auction.end_time || auction.endTime); // Support both field names
      const difference = endTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
      } else {
        setTimeLeft('Ended');
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [auction?.end_time, auction?.endTime]);

  const handleCardClick = () => {
    console.log('Navigating to auction:', auction.id);
    router.push(`/auction-details/${auction.id}`);
  };

  const handleQuickBid = (e) => {
    e?.stopPropagation();
    console.log('Quick bid for auction:', auction.id);
    router.push(`/auction-details/${auction.id}?action=bid`);
  };

  const handleFavorite = (e) => {
    e?.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  const getStatusBadge = () => {
    if (timeLeft === 'Ended') {
      return <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">Ended</span>;
    }
    const currentPrice = auction?.current_price || auction?.currentBid || 0;
    const reservePrice = auction?.reserve_price || auction?.reservePrice || 0;
    
    if (currentPrice >= reservePrice && reservePrice > 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-success text-success-foreground rounded-full">Reserve Met</span>;
    }
    if (reservePrice === 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full">No Reserve</span>;
    }
    return null;
  };

  const getTimeLeftColor = () => {
    if (timeLeft === 'Ended') return 'text-muted-foreground';
    if (timeLeft?.includes('m') && !timeLeft?.includes('h') && !timeLeft?.includes('d')) return 'text-error';
    if (timeLeft?.includes('h') && !timeLeft?.includes('d')) return 'text-warning';
    return 'text-foreground';
  };

  if (viewMode === 'list') {
    return (
      <div 
        className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Image */}
          <div className="w-full sm:w-32 h-32 flex-shrink-0">
            <div className="relative w-full h-full overflow-hidden rounded-lg">
              <Image
                src={auction?.primary_image || auction?.image || '/assets/images/no_image.png'}
                alt={auction?.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log('Image failed to load:', e.target.src);
                  if (e.target.src !== '/assets/images/no_image.png') {
                    e.target.src = '/assets/images/no_image.png';
                  }
                }}
              />
              {/* Debug info */}
              {console.log('Auction image data:', {
                primary_image: auction?.primary_image,
                fallback: '/assets/images/no_image.png'
              })}
              <button
                onClick={handleFavorite}
                className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-colors"
              >
                <Icon 
                  name={isFavorited ? "Heart" : "Heart"} 
                  size={16} 
                  color={isFavorited ? "#EF4444" : "white"}
                />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground truncate mb-1">
                  {auction?.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {auction?.description}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge()}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-4">
                <div>
                  <p className="text-xs text-muted-foreground">Current Bid</p>
                  <p className="text-lg font-bold text-primary">
                    ${(auction?.current_price || auction?.currentBid || 0)?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bids</p>
                  <p className="text-sm font-medium text-foreground">
                    {auction?.bid_count || auction?.bidCount || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time Left</p>
                  <p className={`text-sm font-medium ${getTimeLeftColor()}`}>
                    {timeLeft}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                    <Icon name="User" size={12} color="white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Seller</p>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-medium text-foreground">
                        {auction?.seller?.name || 'Anonymous'}
                      </span>
                      {auction?.seller?.verified && (
                        <Icon name="BadgeCheck" size={14} className="text-primary" />
                      )}
                    </div>
                  </div>
                </div>

                {timeLeft !== 'Ended' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleQuickBid}
                    iconName="Zap"
                    iconPosition="left"
                  >
                    Quick Bid
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={() => {
        console.log('Card clicked, auction ID:', auction.id);
        handleCardClick();
      }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={auction?.primary_image || auction?.image || '/assets/images/no_image.png'}
          alt={auction?.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            console.log('Image failed to load:', e.target.src);
            e.target.src = '/assets/images/no_image.png';
          }}
        />
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-colors"
        >
          <Icon 
            name={isFavorited ? "Heart" : "Heart"} 
            size={16} 
            color={isFavorited ? "#EF4444" : "white"}
          />
        </button>
        <div className="absolute top-3 left-3">
          {getStatusBadge()}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-black bg-opacity-70 rounded-lg p-2">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-xs opacity-80">Time Left</p>
                <p className={`text-sm font-medium ${timeLeft === 'Ended' ? 'opacity-60' : ''}`}>
                  {timeLeft}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Bids</p>
                <p className="text-sm font-medium">{auction?.bid_count || auction?.bidCount || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1">
          {auction?.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {auction?.description}
        </p>

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Current Bid</p>
            <p className="text-xl font-bold text-primary">
              ${(auction?.current_price || auction?.currentBid || 0)?.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Next Bid</p>
            <p className="text-sm font-medium text-foreground">
              ${((auction?.current_price || auction?.currentBid || 0) + (auction?.bidIncrement || 1))?.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
              <Icon name="User" size={12} color="white" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium text-foreground">
                  {auction?.seller?.name || 'Anonymous'}
                </span>
                {auction?.seller?.verified && (
                  <Icon name="BadgeCheck" size={12} className="text-primary" />
                )}
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="Star" size={12} className="text-warning" />
                <span className="text-xs text-muted-foreground">
                  {auction?.seller?.rating || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {timeLeft !== 'Ended' && (
            <Button
              variant="default"
              size="sm"
              onClick={handleQuickBid}
              iconName="Zap"
              iconPosition="left"
            >
              Bid
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuctionCard;