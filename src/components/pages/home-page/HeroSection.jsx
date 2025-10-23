import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const HeroSection = () => {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const featuredAuctions = [
    {
      id: 1,
      title: "Vintage Rolex Submariner 1960s",
      description: "Rare vintage Rolex Submariner in excellent condition with original box and papers. A collector\'s dream piece.",
      currentBid: 15800,
      reservePrice: 12000,
      timeRemaining: { hours: 2, minutes: 45, seconds: 30 },
      image: "https://images.unsplash.com/photo-1523170335258-f5c6c6bd6eaf?w=800&h=600&fit=crop",
      seller: {
        name: "WatchCollector_SG",
        rating: 4.9,
        verified: true
      },
      totalBids: 47,
      category: "Watches & Jewelry"
    },
    {
      id: 2,
      title: "Limited Edition Singapore Art Print",
      description: "Exclusive Singapore skyline art print by renowned local artist. Only 50 pieces ever made.",
      currentBid: 680,
      reservePrice: 500,
      timeRemaining: { hours: 5, minutes: 12, seconds: 15 },
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
      seller: {
        name: "ArtGallery_Marina",
        rating: 4.8,
        verified: true
      },
      totalBids: 23,
      category: "Art & Collectibles"
    },
    {
      id: 3,
      title: "MacBook Pro M3 Max 16-inch",
      description: "Brand new sealed MacBook Pro with M3 Max chip, 32GB RAM, 1TB SSD. Perfect for professionals.",
      currentBid: 3200,
      reservePrice: 2800,
      timeRemaining: { hours: 1, minutes: 8, seconds: 42 },
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop",
      seller: {
        name: "TechDeals_SG",
        rating: 4.7,
        verified: true
      },
      totalBids: 89,
      category: "Electronics"
    }
  ];

  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = {};
      featuredAuctions?.forEach(auction => {
        const { hours, minutes, seconds } = auction?.timeRemaining;
        let totalSeconds = hours * 3600 + minutes * 60 + seconds - 1;
        
        if (totalSeconds < 0) totalSeconds = 0;
        
        newTimeLeft[auction.id] = {
          hours: Math.floor(totalSeconds / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60
        };
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredAuctions?.length);
    }, 8000);

    return () => clearInterval(slideTimer);
  }, [featuredAuctions?.length]);

  const handleBidNow = (auctionId) => {
    router.push(`/auction-details?id=${auctionId}`);
  };

  const handleViewDetails = (auctionId) => {
    router.push(`/auction-details?id=${auctionId}`);
  };

  const formatTime = (time) => {
    return time < 10 ? `0${time}` : time;
  };

  const currentAuction = featuredAuctions?.[currentSlide];
  const currentTime = timeLeft?.[currentAuction?.id] || currentAuction?.timeRemaining;

  return (
    <div className="relative bg-gradient-to-br from-red-50 via-red-25 to-pink-50 rounded-2xl overflow-hidden mb-12 singbid-shadow-lg">
      <div className="relative h-[500px] sm:h-[550px] lg:h-[600px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={currentAuction?.image}
            alt={currentAuction?.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/80 via-red-900/60 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl text-white">
              {/* Category Badge */}
              <div className="inline-flex items-center px-2 py-1 sm:px-4 sm:py-2 singbid-gradient backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium text-white mb-2 sm:mb-4 singbid-shadow">
                <Icon name="Star" size={12} className="mr-1.5 sm:mr-2" />
                Featured Auction
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 leading-tight">
                {currentAuction?.title}
              </h1>

              {/* Description */}
              <p className="text-sm sm:text-base lg:text-lg text-red-100 mb-3 sm:mb-6 leading-relaxed line-clamp-2">
                {currentAuction?.description}
              </p>

              {/* Auction Stats - Visible on all screens */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6">
                <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2.5 sm:p-4 border border-white/20">
                  <div className="text-base sm:text-2xl lg:text-3xl font-bold text-white leading-none mb-1">
                    S${currentAuction?.currentBid?.toLocaleString()}
                  </div>
                  <div className="text-[10px] sm:text-sm text-red-200">Current Bid</div>
                </div>

                <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2.5 sm:p-4 border border-white/20">
                  <div className="text-base sm:text-2xl lg:text-3xl font-bold text-white leading-none mb-1">
                    {currentAuction?.totalBids}
                  </div>
                  <div className="text-[10px] sm:text-sm text-red-200">Total Bids</div>
                </div>

                <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2.5 sm:p-4 col-span-2 border border-white/20">
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <div className="text-base sm:text-2xl lg:text-3xl font-bold text-white leading-none">
                      {formatTime(currentTime?.hours || 0)}h {formatTime(currentTime?.minutes || 0)}m {formatTime(currentTime?.seconds || 0)}s
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-sm text-red-200 text-center mt-1">Time Remaining</div>
                </div>
              </div>

              {/* Seller Info - More compact on mobile */}
              <div className="flex items-center space-x-2 sm:space-x-4 mb-3 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 singbid-gradient rounded-full flex items-center justify-center singbid-shadow flex-shrink-0">
                  <Icon name="User" size={14} color="white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="font-semibold text-white text-xs sm:text-base truncate">{currentAuction?.seller?.name}</span>
                    {currentAuction?.seller?.verified && (
                      <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-green-500/20 rounded-full border border-green-400/30">
                        <Icon name="Shield" size={10} className="text-green-400" />
                        <span className="text-[10px] text-green-400 font-medium">Verified</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] sm:text-sm text-red-200">
                    <Icon name="Star" size={10} className="text-yellow-400" />
                    <span>{currentAuction?.seller?.rating}</span>
                    <span>•</span>
                    <span>Singapore Seller</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons - More compact on mobile */}
              <div className="flex flex-col sm:flex-row gap-2 sm:space-x-4">
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => handleBidNow(currentAuction?.id)}
                  iconName="Gavel"
                  iconPosition="left"
                  className="singbid-gradient hover:opacity-90 text-white font-semibold px-4 sm:px-8 py-2 sm:py-3 singbid-shadow text-sm sm:text-base w-full sm:w-auto"
                >
                  Place Bid Now
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleViewDetails(currentAuction?.id)}
                  iconName="Eye"
                  iconPosition="left"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20 px-4 sm:px-8 py-2 sm:py-3 backdrop-blur-sm text-sm sm:text-base w-full sm:w-auto"
                >
                  View Details
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows - Adjusted position */}
        <div className="absolute z-20 left-0 right-0 top-1/2 transform -translate-y-1/2 flex justify-between px-2 sm:px-6">
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + featuredAuctions?.length) % featuredAuctions?.length)}
            className="w-8 h-8 sm:w-12 sm:h-12 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors duration-200 border border-white/20"
          >
            <Icon name="ChevronLeft" size={16} />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % featuredAuctions?.length)}
            className="w-8 h-8 sm:w-12 sm:h-12 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors duration-200 border border-white/20"
          >
            <Icon name="ChevronRight" size={16} />
          </button>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-3 sm:bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-1.5 sm:space-x-2 z-20">
          {featuredAuctions?.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white singbid-shadow' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;