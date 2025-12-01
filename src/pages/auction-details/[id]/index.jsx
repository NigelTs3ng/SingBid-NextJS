import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/ui/Header';
import Breadcrumb from '../../../components/ui/Breadcrumb';
import Toast from '../../../components/ui/Toast';
import ImageGallery from '../../../components/pages/auction-details/ImageGallery';
import AuctionInfo from '../../../components/pages/auction-details/AuctionInfo';
import CountdownTimer from '../../../components/pages/auction-details/CountdownTimer';
import BiddingPanel from '../../../components/pages/auction-details/BiddingPanel';
import BidHistory from '../../../components/pages/auction-details/BidHistory';
import SellerInfo from '../../../components/pages/auction-details/SellerInfo';
import PaymentSecurity from '../../../components/pages/auction-details/PaymentSecurity';
import ExpandableSection from '../../../components/pages/auction-details/ExpandableSection';
import SellerAuctionActions from '../../../components/SellerAuctionActions';
import AuctionCompletionPanel from '../../../components/AuctionCompletionPanel';
import BidderPaymentStatus from '../../../components/BidderPaymentStatus';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const AuctionDetails = () => {
  const router = useRouter();
  const { user } = useAuth();
  const auctionId = router.query.id; // Get the dynamic [id] parameter
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentBid, setCurrentBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [error, setError] = useState(null);
  const [bidRefreshTrigger, setBidRefreshTrigger] = useState(0);
  const [lastStatusCheck, setLastStatusCheck] = useState(0);
  const [toast, setToast] = useState(null);


  // Fetch real auction data from API
  useEffect(() => {
    const fetchAuctionData = async () => {
      if (!auctionId) {
        console.log('No auction ID found');
        return;
      }
      
      console.log('Fetching auction data for ID:', auctionId);
      setLoading(true);
      setError(null);
      
      try {
        // Fetch auction details
        console.log('Calling API:', `/api/auctions/${auctionId}`);
        const auctionResponse = await fetch(`/api/auctions/${auctionId}`);
        console.log('Auction API response status:', auctionResponse.status);
        
        if (!auctionResponse.ok) {
          const errorData = await auctionResponse.text();
          console.error('Auction API error:', errorData);
          throw new Error('Auction not found');
        }
        
        const auctionResult = await auctionResponse.json();
        console.log('Auction data:', auctionResult);
        const { auction: auctionData } = auctionResult;
        
        // Fetch bid history
        const bidsResponse = await fetch(`/api/bids?auction_id=${auctionId}`);
        if (bidsResponse.ok) {
          const { bids: bidData } = await bidsResponse.json();
          setBids(bidData || []);
        }
        
        setAuction(auctionData);
        setCurrentBid(auctionData.current_price);
        
      } catch (error) {
        console.error('Error fetching auction data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctionData();
  }, [auctionId]);
  
  // Periodically check auction status to catch any updates
  useEffect(() => {
    if (!auction || !auctionId) return;
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/auctions/${auctionId}`);
        if (response.ok) {
          const { auction: currentAuction } = await response.json();
          if (currentAuction.status !== auction.status) {
            console.log('Auction status changed from', auction.status, 'to', currentAuction.status);
            setAuction(currentAuction);
            setBidRefreshTrigger(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    };
    
    const interval = setInterval(checkStatus, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  }, [auction?.status, auctionId]);

  const handlePlaceBid = async (amount, paymentOptions) => {
    if (!auction?.id) {
      setToast({ message: 'No auction available', type: 'error' });
      return Promise.reject('No auction available');
    }
    if (!user) {
      setToast({ message: 'Authentication required. Please sign in.', type: 'error' });
      return Promise.reject('Authentication required');
    }
    if (!paymentOptions) {
      setToast({ message: 'Please select a payment method to place your bid', type: 'warning' });
      return Promise.reject('Payment method is required');
    }
    if (paymentOptions.type === 'card' && !paymentOptions.paymentMethodId) {
      setToast({ message: 'Please select a card to place your bid', type: 'warning' });
      return Promise.reject('Payment method is required');
    }
    
    try {
      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auction_id: auction.id,
          amount: parseFloat(amount),
          payment_method_id: paymentOptions.type === 'card' ? paymentOptions.paymentMethodId : null,
          bidcoin_payment: paymentOptions.type === 'bidcoin'
        })
      });
      
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to place bid';
        setToast({ message: errorMessage, type: 'error', duration: 6000 });
        return Promise.reject(errorMessage);
      }
      const new_current_price = data?.new_current_price ?? amount;
      
      // Update local state
      setCurrentBid(new_current_price);
      setAuction(prev => ({ ...prev, current_price: new_current_price }));
      
      // Show success toast
      if (paymentOptions.type === 'bidcoin') {
        setToast({ message: `Bid placed with BidCoins! ${data?.bidcoin_hold ?? 0} coins reserved.`, type: 'success' });
      } else {
        setToast({ message: `Bid placed successfully! New bid: $${new_current_price}`, type: 'success' });
      }
      
      // Refresh bid history
      const bidsResponse = await fetch(`/api/bids?auction_id=${auctionId}`);
      if (bidsResponse.ok) {
        const { bids: bidData } = await bidsResponse.json();
        setBids(bidData || []);
        console.log('Refreshed bids after placement:', bidData);
      }
      
      // Trigger refresh for BidderPaymentStatus
      setBidRefreshTrigger(prev => prev + 1);
      
      return Promise.resolve(data);
      
    } catch (error) {
      console.error('Bid placement error:', error);
      // Error toast already shown above, don't reject again
      return Promise.reject(error.message);
    }
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

  // Remove server-side specific rendering to avoid hydration mismatch

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

  if (error || (!loading && !auction)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Icon name="AlertCircle" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-medium text-foreground mb-2">
                {error === 'Auction not found' ? 'Auction not found' : 'Error loading auction'}
              </h2>
              <p className="text-muted-foreground mb-4">
                {error === 'Auction not found' 
                  ? "The auction you're looking for doesn't exist or has been removed."
                  : error || 'Something went wrong while loading the auction details.'}
              </p>
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
      
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type || 'info'}
          duration={toast.duration || 5000}
          onClose={() => setToast(null)}
        />
      )}
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Breadcrumb customItems={breadcrumbItems} />
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <ImageGallery 
              images={auction.images?.map(img => img.url) || []} 
              title={auction.title} 
            />
            
            {/* Auction Information */}
            <AuctionInfo auction={auction} />
            
            {/* Mobile Bidding Panel */}
            <div className="lg:hidden">
              <CountdownTimer endTime={auction.end_time} status={auction.status} />
              <div className="mt-4">
                <BiddingPanel
                  auction={auction}
                  currentBid={currentBid}
                  onPlaceBid={handlePlaceBid}
                  isAuthenticated={!!user}
                  currentUser={user}
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
                    <h4 className="font-medium text-foreground mb-2">Shipping Methods</h4>
                    <div className="space-y-2">
                      {auction.shipping_methods?.map((method, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{method}</span>
                          <span className="font-medium">
                            {auction.shipping_cost > 0 ? `$${auction.shipping_cost.toFixed(2)}` : 'Free'}
                          </span>
                        </div>
                      )) || (
                        <div className="flex justify-between">
                          <span>Standard Delivery</span>
                          <span className="font-medium">Contact seller for details</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {auction.location && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Item Location</h4>
                      <p>{auction.location}</p>
                    </div>
                  )}
                </div>
              </ExpandableSection>
              
              <ExpandableSection title="Return & Dispute Policy" icon="RotateCcw" defaultExpanded={false}>
                <div className="space-y-4 text-sm text-muted-foreground">
                  {auction.return_policy && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Return Policy</h4>
                      <p>{auction.return_policy}</p>
                      {auction.return_conditions && (
                        <p className="mt-2 text-xs">{auction.return_conditions}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Dispute Resolution</h4>
                    <p>Our dispute resolution team mediates conflicts between buyers and sellers. Funds are held until disputes are resolved.</p>
                  </div>
                  {auction.additional_requirements && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Additional Requirements</h4>
                      <p>{auction.additional_requirements}</p>
                    </div>
                  )}
                </div>
              </ExpandableSection>
            </div>
          </div>
          
          {/* Right Column - Bidding and Seller Info */}
          <div className="space-y-6">
            {/* Desktop Countdown and Bidding */}
            <div className="hidden lg:block space-y-4">
              <CountdownTimer endTime={auction.end_time} status={auction.status} />
              <BiddingPanel
                auction={auction}
                currentBid={currentBid}
                onPlaceBid={handlePlaceBid}
                isAuthenticated={!!user}
                currentUser={user}
              />
            </div>
            
            {/* Bidder Payment Status */}
            <BidderPaymentStatus
              auctionId={auction.id}
              currentUser={user}
              refreshTrigger={bidRefreshTrigger}
            />
            
            {/* Seller Information */}
            <SellerInfo
              seller={auction.seller}
              onFollow={handleFollow}
              isFollowing={isFollowing}
            />
            
            {/* Auction Completion Panel */}
            <AuctionCompletionPanel
              auction={auction}
              currentUser={user}
              onAuctionCompleted={async (result) => {
                console.log('Auction completion result:', result);
                
                // IMMEDIATELY update auction status locally
                setAuction(prev => ({ 
                  ...prev, 
                  status: 'completed'
                }));
                
                // Force component re-render by updating state
                setCurrentBid(result.winning_amount || auction.current_price);
                setBidRefreshTrigger(prev => prev + 1);
                
                // Refetch data in background to ensure consistency
                setTimeout(async () => {
                  try {
                    console.log('Refetching auction data after completion...');
                    const auctionResponse = await fetch(`/api/auctions/${auctionId}`);
                    if (auctionResponse.ok) {
                      const { auction: updatedAuction } = await auctionResponse.json();
                      console.log('Updated auction status:', updatedAuction.status);
                      setAuction(updatedAuction);
                    }
                    
                    // Refetch bids to show updated statuses
                    const bidsResponse = await fetch(`/api/bids?auction_id=${auctionId}`);
                    if (bidsResponse.ok) {
                      const { bids: updatedBids } = await bidsResponse.json();
                      setBids(updatedBids || []);
                    }
                  } catch (error) {
                    console.error('Error refreshing auction data:', error);
                  }
                }, 1000); // 1 second delay to allow database to update
              }}
              onNotify={({ type, message }) =>
                setToast({ message, type: type || 'success', duration: 6000 })
              }
            />
            
            {/* Seller Auction Actions */}
            <SellerAuctionActions
              auction={auction}
              currentUser={user}
              onAuctionUpdated={(action, auctionId) => {
                if (action === 'deleted') {
                  // Redirect to seller dashboard after deletion
                  window.location.href = '/dashboard/seller';
                }
              }}
            />
            
            {/* Payment Security */}
            <PaymentSecurity />
            
          </div>
        </div>
        
        {/* Bid History Section */}
        <div className="mt-12">
          <BidHistory auctionId={auction.id} initialBids={bids} />
        </div>
        
      </main>
    </div>
  );
};

// Server-side rendering for dynamic auction details
export async function getServerSideProps(context) {
  // This ensures the page is rendered on each request
  // and prevents Next.js from trying to statically generate it
  return {
    props: {
      // We'll fetch data on the client side instead
    },
  }
}

export default AuctionDetails;
