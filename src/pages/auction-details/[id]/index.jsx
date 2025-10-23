"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Header from '../../../components/ui/Header';
import Breadcrumb from '../../../components/ui/Breadcrumb';
import ImageGallery from '../../../components/pages/auction-details/ImageGallery';
import AuctionInfo from '../../../components/pages/auction-details/AuctionInfo';
import CountdownTimer from '../../../components/pages/auction-details/CountdownTimer';
import BiddingPanel from '../../../components/pages/auction-details/BiddingPanel';
import BidHistory from '../../../components/pages/auction-details/BidHistory';
import SellerInfo from '../../../components/pages/auction-details/SellerInfo';
import PaymentSecurity from '../../../components/pages/auction-details/PaymentSecurity';
import ExpandableSection from '../../../components/pages/auction-details/ExpandableSection';
import Icon from '../../../components/AppIcon';

const AuctionDetails = () => {
  const router = useRouter();
  const params = useParams();
  const auctionId = params.id; // Get the dynamic [id] parameter
  
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Mock authentication
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentBid, setCurrentBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auction, setAuction] = useState(null);

  // Mock auction data - In real app, this would fetch based on auctionId
  const mockAuctions = {
    '1': {
      id: "AUC-2024-001",
      title: "Vintage Rolex Submariner 1960s - Rare Collector's Edition",
      description: `This exceptional vintage Rolex Submariner from the 1960s represents one of the most sought-after timepieces in horological history. The watch features the iconic black dial with luminous hour markers and hands, housed in a stainless steel case that has developed a beautiful patina over the decades.\n\nThe timepiece comes with its original bracelet and has been carefully maintained by certified watchmakers. All original components are intact, including the crown and crystal. The movement has been recently serviced and keeps excellent time.\n\nThis particular model is highly coveted by collectors due to its historical significance and rarity. Documentation includes service records and authenticity certificates.`,
      category: "Watches & Jewelry",
      startingPrice: 8500,
      reservePrice: 12000,
      reserveMet: false,
      currentBid: 9250,
      totalBids: 23,
      watchers: 156,
      startTime: "2024-09-25T10:00:00Z",
      endTime: "2024-10-02T18:00:00Z",
      status: "active",
      location: "Singapore",
      condition: "Excellent - Vintage",
      authenticated: true,
      shippingInfo: "Free shipping within Singapore",
      featured: true,
      images: [
        "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1548181048-dcea1c2d4b5b?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&h=600&fit=crop"
      ]
    },
    '2': {
      id: "AUC-2024-002",
      title: "MacBook Pro 16-inch M3 Max - Brand New Sealed",
      description: "Brand new MacBook Pro with M3 Max chip, 32GB RAM, 1TB SSD. Still sealed in original packaging with full warranty.",
      category: "Electronics",
      startingPrice: 3000,
      reservePrice: 0,
      reserveMet: true,
      currentBid: 3200,
      totalBids: 45,
      watchers: 89,
      startTime: "2024-09-28T09:00:00Z",
      endTime: "2024-09-29T21:00:00Z",
      status: "active",
      location: "Singapore",
      condition: "Brand New",
      authenticated: true,
      shippingInfo: "Free shipping within Singapore",
      featured: false,
      images: [
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop"
      ]
    }
  };

  const seller = {
    id: "seller_001",
    username: "WatchCollectorSG",
    avatar: "https://randomuser.me/api/portraits/men/45.jpg",
    rating: 4.8,
    totalReviews: 127,
    memberSince: "2019-03-15T00:00:00Z",
    totalAuctions: 89,
    followers: 1243,
    successRate: 96,
    isVerified: true,
    isPremium: true,
    isKYCVerified: true,
    bio: "Passionate watch collector and dealer with over 15 years of experience in vintage timepieces. Specializing in Rolex, Omega, and other luxury Swiss brands.",
    badges: [
      { name: "Top Seller", icon: "Award" },
      { name: "Watch Expert", icon: "Clock" },
      { name: "Trusted Dealer", icon: "Shield" }
    ]
  };

  const initialBids = [
    {
      id: 1,
      bidder: {
        username: "TimeCollector88",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        isVerified: true
      },
      amount: 9250,
      timestamp: "2024-09-29T18:30:00Z",
      isAutoBid: false
    },
    {
      id: 2,
      bidder: {
        username: "VintageWatchLover",
        avatar: "https://randomuser.me/api/portraits/women/28.jpg",
        isVerified: false
      },
      amount: 9100,
      timestamp: "2024-09-29T17:45:00Z",
      isAutoBid: true
    },
    {
      id: 3,
      bidder: {
        username: "RolexEnthusiast",
        avatar: "https://randomuser.me/api/portraits/men/55.jpg",
        isVerified: true
      },
      amount: 8950,
      timestamp: "2024-09-29T16:20:00Z",
      isAutoBid: false
    },
    {
      id: 4,
      bidder: {
        username: "SGWatchDealer",
        avatar: "https://randomuser.me/api/portraits/women/42.jpg",
        isVerified: true
      },
      amount: 8800,
      timestamp: "2024-09-29T15:10:00Z",
      isAutoBid: false
    },
    {
      id: 5,
      bidder: {
        username: "HorologicalSociety",
        avatar: "https://randomuser.me/api/portraits/men/38.jpg",
        isVerified: true
      },
      amount: 8650,
      timestamp: "2024-09-29T14:30:00Z",
      isAutoBid: false
    }
  ];

  // Simulate fetching auction data based on ID
  useEffect(() => {
    const fetchAuctionData = async () => {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Handle build-time rendering (when auctionId might be undefined)
      if (typeof window === 'undefined' && !auctionId) {
        // Server-side rendering during build - use default data
        setAuction(mockAuctions['1']);
        setCurrentBid(mockAuctions['1'].currentBid);
        setLoading(false);
        return;
      }
      
      // Ensure auctionId exists and is valid
      if (!auctionId || typeof auctionId !== 'string') {
        setLoading(false);
        return;
      }
      
      const auctionData = mockAuctions[auctionId];
      
      if (auctionData) {
        setAuction(auctionData);
        setCurrentBid(auctionData.currentBid);
      } else {
        // For build-time rendering, provide fallback data
        if (typeof window === 'undefined') {
          // Server-side rendering - use default data
          setAuction(mockAuctions['1']);
          setCurrentBid(mockAuctions['1'].currentBid);
        } else {
          // Client-side - redirect to 404
          router.push('/404');
          return;
        }
      }
      
      setLoading(false);
    };

    fetchAuctionData();
  }, [auctionId, router]);

  const handlePlaceBid = async (amount) => {
    if (!auction?.id) return Promise.reject('No auction available');
    
    // Simulate bid placement
    return new Promise((resolve) => {
      setTimeout(() => {
        setCurrentBid(amount);
        resolve();
      }, 1000);
    });
  };

  const handleFollow = async (sellerId) => {
    if (!sellerId) return Promise.reject('No seller ID provided');
    
    // Simulate follow/unfollow
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsFollowing(!isFollowing);
        resolve();
      }, 500);
    });
  };

  // Handle build-time rendering with no auction data
  if (typeof window === 'undefined' && !auction) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="h-96 bg-muted rounded"></div>
                <div className="space-y-4">
                  <div className="h-6 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-48 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-medium text-foreground">Loading auction details...</h2>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Icon name="AlertCircle" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-medium text-foreground mb-2">Auction not found</h2>
              <p className="text-muted-foreground mb-4">The auction you're looking for doesn't exist or has been removed.</p>
              <Button onClick={() => router.push('/auction-listings')}>
                Browse Other Auctions
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Home', path: '/home-page' },
    { label: 'Browse Auctions', path: '/auction-listings' },
    { label: auction?.title || 'Auction Details', isActive: true }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Breadcrumb customItems={breadcrumbItems} />
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <ImageGallery images={auction.images} title={auction.title} />
            
            {/* Auction Information */}
            <AuctionInfo auction={auction} />
            
            {/* Mobile Bidding Panel */}
            <div className="lg:hidden">
              <CountdownTimer endTime={auction.endTime} status={auction.status} />
              <div className="mt-4">
                <BiddingPanel
                  auction={auction}
                  currentBid={currentBid}
                  onPlaceBid={handlePlaceBid}
                  isAuthenticated={isAuthenticated}
                />
              </div>
            </div>
            
            {/* Expandable Sections */}
            <div className="space-y-4">
              <ExpandableSection title="Terms & Conditions" icon="FileText" defaultExpanded={false}>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Bidding Terms</h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>All bids are binding and cannot be retracted</li>
                      <li>Payment must be completed within 48 hours of auction end</li>
                      <li>Buyer is responsible for pickup or shipping arrangements</li>
                      <li>Items are sold as-is with no warranty unless specified</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Payment & Fees</h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>5% platform fee applies to all successful auctions</li>
                      <li>Payment methods: Credit card, PayNow, Bank transfer</li>
                      <li>Funds are held for 5 days pending buyer confirmation</li>
                      <li>Disputes must be raised within 7 days of delivery</li>
                    </ul>
                  </div>
                </div>
              </ExpandableSection>
              
              <ExpandableSection title="Shipping & Delivery" icon="Truck" defaultExpanded={false}>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Shipping Options</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Standard Delivery (3-5 days)</span>
                        <span className="font-medium">Free</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Express Delivery (1-2 days)</span>
                        <span className="font-medium">S$15.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Same Day Delivery</span>
                        <span className="font-medium">S$25.00</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Pickup Options</h4>
                    <p>Self-collection available from Orchard Road, Singapore. Please arrange pickup within 7 days of auction end.</p>
                  </div>
                </div>
              </ExpandableSection>
              
              <ExpandableSection title="Return & Dispute Policy" icon="RotateCcw" defaultExpanded={false}>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Return Policy</h4>
                    <p>Returns accepted within 7 days if item significantly differs from description. Buyer pays return shipping unless item is defective.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Dispute Resolution</h4>
                    <p>Our dispute resolution team mediates conflicts between buyers and sellers. Funds are held until disputes are resolved.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Authenticity Guarantee</h4>
                    <p>All items marked as authenticated have been verified by our experts. Full refund if authenticity is disputed and proven false.</p>
                  </div>
                </div>
              </ExpandableSection>
            </div>
          </div>
          
          {/* Right Column - Bidding and Seller Info */}
          <div className="space-y-6">
            {/* Desktop Countdown and Bidding */}
            <div className="hidden lg:block space-y-4">
              <CountdownTimer endTime={auction.endTime} status={auction.status} />
              <BiddingPanel
                auction={auction}
                currentBid={currentBid}
                onPlaceBid={handlePlaceBid}
                isAuthenticated={isAuthenticated}
              />
            </div>
            
            {/* Seller Information */}
            <SellerInfo
              seller={seller}
              onFollow={handleFollow}
              isFollowing={isFollowing}
            />
            
            {/* Payment Security */}
            <PaymentSecurity />
            
            {/* Watch This Auction */}
            <div className="bg-card border border-border rounded-lg p-4">
              <button className="w-full flex items-center justify-center space-x-2 py-2 text-muted-foreground hover:text-foreground transition-colors duration-200">
                <Icon name="Eye" size={16} />
                <span className="text-sm font-medium">Watch This Auction</span>
              </button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Get notified about bid updates
              </p>
            </div>
          </div>
        </div>
        
        {/* Bid History Section */}
        <div className="mt-12">
          <BidHistory auctionId={auction.id} initialBids={initialBids} />
        </div>
        
        {/* Related Auctions */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Similar Auctions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4]?.map((item) => (
              <div key={item} className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
                <div className="aspect-square bg-muted"></div>
                <div className="p-4">
                  <h3 className="font-medium text-foreground mb-2">Related Auction {item}</h3>
                  <p className="text-sm text-muted-foreground mb-2">Current bid: S$1,250</p>
                  <p className="text-xs text-muted-foreground">Ends in 2 days</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

// Static generation configuration for dynamic routes
export async function getStaticPaths() {
  // Return empty paths and enable fallback to prevent build-time generation
  return {
    paths: [],
    fallback: 'blocking' // or true for client-side rendering
  };
}

export async function getStaticProps({ params }) {
  // This function runs at build time and request time for fallback pages
  const { id } = params;
  
  // Mock auction data - in real app, fetch from API
  const mockAuctions = {
    '1': {
      id: "AUC-2024-001",
      title: "Vintage Rolex Submariner 1960s - Rare Collector's Edition",
      currentBid: 9250,
      // ... other auction data
    },
    '2': {
      id: "AUC-2024-002", 
      title: "MacBook Pro 16-inch M3 Max - Brand New Sealed",
      currentBid: 3200,
      // ... other auction data
    }
  };
  
  const auction = mockAuctions[id];
  
  if (!auction) {
    return {
      notFound: true,
    };
  }
  
  return {
    props: {
      auction,
      auctionId: id,
    },
    revalidate: 60, // Revalidate every 60 seconds
  };
}

export default AuctionDetails;