import React from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const RecentlyCompletedSection = () => {
  const router = useRouter();

  const completedAuctions = [
    {
      id: 101,
      title: "Apple MacBook Pro 16-inch M3 Max",
      finalPrice: 3450,
      originalEstimate: 3200,
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop",
      winner: "TechBuyer_SG",
      seller: "AppleStore_Official",
      completedAt: "2 hours ago",
      totalBids: 156,
      category: "Electronics",
      soldAboveReserve: true
    },
    {
      id: 102,
      title: "Vintage Cartier Tank Watch 1970s",
      finalPrice: 4200,
      originalEstimate: 3500,
      image: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=300&h=200&fit=crop",
      winner: "WatchCollector_Marina",
      seller: "VintageTimepieces_SG",
      completedAt: "5 hours ago",
      totalBids: 89,
      category: "Watches & Jewelry",
      soldAboveReserve: true
    },
    {
      id: 103,
      title: "Singapore Shophouse Miniature Model",
      finalPrice: 850,
      originalEstimate: 600,
      image: "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=300&h=200&fit=crop",
      winner: "Heritage_Lover",
      seller: "LocalArtisan_SG",
      completedAt: "1 day ago",
      totalBids: 34,
      category: "Art & Collectibles",
      soldAboveReserve: true
    },
    {
      id: 104,
      title: "PlayStation 5 Digital Edition Bundle",
      finalPrice: 620,
      originalEstimate: 550,
      image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=300&h=200&fit=crop",
      winner: "Gamer_SG_2024",
      seller: "GameHub_Singapore",
      completedAt: "1 day ago",
      totalBids: 67,
      category: "Electronics",
      soldAboveReserve: true
    },
    {
      id: 105,
      title: "Hermès Silk Scarf Limited Edition",
      finalPrice: 380,
      originalEstimate: 300,
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=200&fit=crop",
      winner: "FashionLover_Orchard",
      seller: "LuxuryBoutique_SG",
      completedAt: "2 days ago",
      totalBids: 28,
      category: "Fashion & Accessories",
      soldAboveReserve: true
    },
    {
      id: 106,
      title: "Antique Chinese Tea Set Qing Dynasty",
      finalPrice: 1200,
      originalEstimate: 800,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop",
      winner: "AntiqueCollector_SG",
      seller: "HeritageAuctions_SG",
      completedAt: "3 days ago",
      totalBids: 45,
      category: "Art & Collectibles",
      soldAboveReserve: true
    }
  ];

  const handleViewAllCompleted = () => {
    router.push('/auction-listings?status=completed');
  };

  const handleViewAuction = (auctionId) => {
    router.push(`/auction-details/${auctionId}?status=completed`);
  };

  const calculatePriceIncrease = (finalPrice, estimate) => {
    const increase = ((finalPrice - estimate) / estimate) * 100;
    return Math.round(increase);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Recently Completed Auctions</h2>
          <p className="text-muted-foreground">
            See what items have sold and their final prices
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={handleViewAllCompleted}
          iconName="ArrowRight"
          iconPosition="right"
        >
          View All Completed
        </Button>
      </div>
      {/* Completed Auctions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {completedAuctions?.map((auction) => (
          <div
            key={auction?.id}
            className="bg-background border border-border rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer group"
            onClick={() => handleViewAuction(auction?.id)}
          >
            {/* Image */}
            <div className="relative h-32 overflow-hidden">
              <Image
                src={auction?.image}
                alt={auction?.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Sold Badge */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-success/90 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                SOLD
              </div>
              
              {/* Category */}
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full">
                {auction?.category}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Title */}
              <h3 className="font-semibold text-foreground text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-200">
                {auction?.title}
              </h3>

              {/* Price Information */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Final Price</span>
                  <span className="text-lg font-bold text-success">
                    S${auction?.finalPrice?.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Original Estimate</span>
                  <span className="text-sm text-muted-foreground line-through">
                    S${auction?.originalEstimate?.toLocaleString()}
                  </span>
                </div>

                {/* Price Increase */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Price Increase</span>
                  <div className="flex items-center space-x-1">
                    <Icon name="TrendingUp" size={12} className="text-success" />
                    <span className="text-xs font-medium text-success">
                      +{calculatePriceIncrease(auction?.finalPrice, auction?.originalEstimate)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Auction Stats */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center space-x-1">
                  <Icon name="Gavel" size={12} />
                  <span>{auction?.totalBids} bids</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="Clock" size={12} />
                  <span>{auction?.completedAt}</span>
                </div>
              </div>

              {/* Winner & Seller Info */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Winner:</span>
                  <span className="font-medium text-foreground">{auction?.winner}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Seller:</span>
                  <span className="font-medium text-foreground">{auction?.seller}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Success Stories Section */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-success">
              S${completedAuctions?.reduce((sum, auction) => sum + auction?.finalPrice, 0)?.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Sales This Week</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-primary">
              {completedAuctions?.reduce((sum, auction) => sum + auction?.totalBids, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Bids Placed</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-warning">
              {Math.round(completedAuctions?.reduce((sum, auction) => 
                sum + calculatePriceIncrease(auction?.finalPrice, auction?.originalEstimate), 0
              ) / completedAuctions?.length)}%
            </div>
            <div className="text-sm text-muted-foreground">Average Price Increase</div>
          </div>
        </div>
      </div>
      {/* Call to Action */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Ready to start your own auction? List your items and reach thousands of bidders.
        </p>
        <Button
          variant="default"
          onClick={() => router.push('/create-auction')}
          iconName="Plus"
          iconPosition="left"
        >
          Create Your First Auction
        </Button>
      </div>
    </div>
  );
};

export default RecentlyCompletedSection;