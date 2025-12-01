import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const HeroSection = () => {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredAuctions, setFeaturedAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedAuctions();
  }, []);

  const fetchFeaturedAuctions = async () => {
    try {
      // Fetch top 3 auctions by current price that are active using API route
      let response;
      try {
        response = await fetch('/api/auctions?status=active&limit=3', {
          cache: 'no-store'
        });
      } catch (networkError) {
        console.error('Network error fetching auctions:', networkError);
        throw new Error('Network error: Unable to connect to server');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Failed to fetch auctions' };
        }
        console.error('API Error:', errorData, 'Status:', response.status);
        console.error('Error details:', errorData.details);
        // Use the detailed error message if available
        const errorMessage = errorData.error || errorData.message || 'Failed to fetch auctions';
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error('Invalid response from server');
      }
      
      const auctionsData = data.auctions || [];

      // Filter to only show active auctions that haven't ended yet
      const now = new Date();
      const activeAuctions = auctionsData.filter(auction => {
        // Must be active status
        if (auction.status !== 'active') return false;
        // Must not have passed end_time
        const endTime = new Date(auction.end_time);
        return endTime > now;
      });

      // Sort by current_price descending and take top 3
      const sortedAuctions = [...activeAuctions]
        .sort((a, b) => (b.current_price || 0) - (a.current_price || 0))
        .slice(0, 3);

      // Fetch bid counts for each auction (optional, don't fail if it errors)
      const auctionsWithBids = await Promise.all(
        sortedAuctions.map(async (auction) => {
          try {
            const bidsResponse = await fetch(`/api/bids?auction_id=${auction.id}`);
            const bidsData = await bidsResponse.json();
            const bidCount = bidsData.bids?.length || bidsData.count || 0;
            return { ...auction, bidCount };
          } catch {
            return { ...auction, bidCount: 0 };
          }
        })
      );

      // Transform data to match component structure
      const transformedAuctions = auctionsWithBids.map(auction => {
        const endTime = new Date(auction.end_time);
        const now = new Date();
        const diff = endTime - now;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return {
          id: auction.id,
          title: auction.title,
          description: auction.description,
          currentBid: auction.current_price,
          reservePrice: auction.reserve_price || auction.starting_price,
          end_time: auction.end_time,
          timeRemaining: { hours: Math.max(0, hours), minutes: Math.max(0, minutes), seconds: Math.max(0, seconds) },
          image: auction.primary_image || auction.images?.[0]?.url || auction.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop',
          seller: {
            name: 'BidWin Seller',
            rating: 4.5,
            verified: true
          },
          totalBids: auction.bidCount || 0,
          category: auction.category || 'General'
        };
      });

      // If no auctions found, show placeholder
      if (transformedAuctions.length === 0) {
        setFeaturedAuctions([{
          id: 'placeholder',
          title: "No Featured Auctions Available",
          description: "Check back soon for exciting new auctions!",
          currentBid: 0,
          reservePrice: 0,
          timeRemaining: { hours: 0, minutes: 0, seconds: 0 },
          image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop',
          seller: {
            name: "BidWin Team",
            rating: 5.0,
            verified: true
          },
          totalBids: 0,
          category: "Coming Soon"
        }]);
      } else {
        setFeaturedAuctions(transformedAuctions);
      }
    } catch (error) {
      console.error('Error fetching featured auctions:', error);
      // Set placeholder on error
      setFeaturedAuctions([{
        id: 'error',
        title: "Unable to Load Featured Auctions",
        description: "Please refresh the page to try again.",
        currentBid: 0,
        reservePrice: 0,
        timeRemaining: { hours: 0, minutes: 0, seconds: 0 },
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop',
        seller: {
          name: "BidWin Team",
          rating: 5.0,
          verified: true
        },
        totalBids: 0,
        category: "Error"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const [timeLeft, setTimeLeft] = useState({});

  // Initialize timeLeft when featuredAuctions change
  useEffect(() => {
    if (!featuredAuctions || featuredAuctions.length === 0) return;

    const initialTimeLeft = {};
    featuredAuctions.forEach(auction => {
      if (auction.end_time) {
        const endTime = new Date(auction.end_time);
        const now = new Date();
        const diff = Math.max(0, endTime - now);
        
        initialTimeLeft[auction.id] = {
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        };
      } else if (auction.timeRemaining) {
        initialTimeLeft[auction.id] = { ...auction.timeRemaining };
      } else {
        initialTimeLeft[auction.id] = { hours: 0, minutes: 0, seconds: 0 };
      }
    });
    setTimeLeft(initialTimeLeft);
  }, [featuredAuctions]);

  // Update timer every second
  useEffect(() => {
    if (!featuredAuctions || featuredAuctions.length === 0) return;

    const timer = setInterval(() => {
      const newTimeLeft = {};
      featuredAuctions.forEach(auction => {
        // Recalculate from end_time if available, otherwise use stored timeRemaining
        if (auction.end_time) {
          const endTime = new Date(auction.end_time);
          const now = new Date();
          const diff = Math.max(0, endTime - now);
          
          newTimeLeft[auction.id] = {
            hours: Math.floor(diff / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000)
          };
        } else if (auction.timeRemaining) {
          const { hours = 0, minutes = 0, seconds = 0 } = auction.timeRemaining;
        let totalSeconds = hours * 3600 + minutes * 60 + seconds - 1;
        
        if (totalSeconds < 0) totalSeconds = 0;
        
        newTimeLeft[auction.id] = {
          hours: Math.floor(totalSeconds / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60
        };
        } else {
          newTimeLeft[auction.id] = { hours: 0, minutes: 0, seconds: 0 };
        }
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [featuredAuctions]);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredAuctions?.length);
    }, 8000);

    return () => clearInterval(slideTimer);
  }, [featuredAuctions?.length]);

  const handleBidNow = (auctionId) => {
    if (!auctionId) return;
    router.push(`/auction-details/${auctionId}`);
  };

  const handleViewDetails = (auctionId) => {
    if (!auctionId) return;
    router.push(`/auction-details/${auctionId}`);
  };

  const formatTime = (time) => {
    return time < 10 ? `0${time}` : time;
  };

  const currentAuction = featuredAuctions?.[currentSlide];
  const currentTime = currentAuction?.id 
    ? (timeLeft[currentAuction.id] || currentAuction?.timeRemaining || { hours: 0, minutes: 0, seconds: 0 })
    : { hours: 0, minutes: 0, seconds: 0 };

  return (
    <div className="relative bg-gradient-to-br from-red-50 via-red-25 to-pink-50 rounded-2xl overflow-hidden mb-12 bidwin-shadow-lg">
      <div className="relative h-[500px] sm:h-[650px] lg:h-[750px] xl:h-[800px]">
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
        <div className="relative z-10 h-full flex items-center py-12 lg:py-16 xl:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl text-white">
              {/* Category Badge */}
              <div className="inline-flex items-center px-2 py-1 sm:px-4 sm:py-2 bidwin-gradient backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium text-white mb-4 sm:mb-6 bidwin-shadow">
                <Icon name="Star" size={12} className="mr-1.5 sm:mr-2" />
                Featured Auction
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 sm:mb-6 lg:mb-8 leading-tight">
                {currentAuction?.title}
              </h1>

              {/* Description */}
              <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-red-100 mb-6 sm:mb-8 lg:mb-10 leading-relaxed line-clamp-2">
                {currentAuction?.description}
              </p>

              {/* Auction Stats - Visible on all screens */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-10">
                <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2.5 sm:p-4 border border-white/20">
                  <div className="text-base sm:text-2xl lg:text-3xl font-bold text-white leading-none mb-1">
                    ${currentAuction?.currentBid?.toLocaleString()}
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
              <div className="flex items-center space-x-2 sm:space-x-4 mb-6 sm:mb-8 lg:mb-10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bidwin-gradient rounded-full flex items-center justify-center bidwin-shadow flex-shrink-0">
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
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 mb-8 sm:mb-0">
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => handleBidNow(currentAuction?.id)}
                  iconName="Gavel"
                  iconPosition="left"
                  className="bidwin-gradient hover:opacity-90 text-white font-semibold px-4 sm:px-8 py-2 sm:py-3 bidwin-shadow text-sm sm:text-base w-full sm:w-auto"
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
                index === currentSlide ? 'bg-white bidwin-shadow' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;