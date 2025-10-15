"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { auctionService } from '../../../lib/services';
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
  const { isAuthenticated } = useAuth();
  
  // Better handling of auction ID with multiple fallback methods
  const getAuctionId = () => {
    // First try params.id
    if (params?.id) return params.id;
    
    // Fallback: extract from current URL path
    if (typeof window !== 'undefined') {
      const pathSegments = window.location.pathname.split('/');
      const idIndex = pathSegments.indexOf('auction-details');
      if (idIndex !== -1 && pathSegments[idIndex + 1]) {
        return pathSegments[idIndex + 1];
      }
    }
    
    return null;
  };
  
  const auctionId = getAuctionId();
  
  const [auction, setAuction] = useState(null);
  const [currentBid, setCurrentBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch auction data with refresh capability
  const fetchAuctionData = useCallback(async (showRefreshing = false) => {
    if (!auctionId) return;
    
    if (showRefreshing) setRefreshing(true);
    if (!auction) setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 AUCTION DETAILS - Fetching auction data for ID:', auctionId);
      const auctionData = await auctionService.getAuctionById(auctionId);
      console.log('🔍 AUCTION DETAILS - Raw auction data received:', auctionData);
      console.log('🔍 AUCTION DETAILS - Images in auction data:', {
        images: auctionData.images,
        imagesType: typeof auctionData.images,
        imagesLength: auctionData.images?.length,
        firstImage: auctionData.images?.[0]
      });
      
      setAuction(auctionData);
      setCurrentBid(auctionData.currentBid);
    } catch (err) {
      console.error('Error fetching auction:', err);
      setError('Failed to load auction details');
      
      if (err.message?.includes('not found')) {
        router.push('/404');
        return;
      }
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, [auctionId, router, auction]);

  // Initial load
  useEffect(() => {
    fetchAuctionData();
  }, [fetchAuctionData]);

  // Real-time subscription for auction updates
  useEffect(() => {
    if (!auction?.id) return;

    let subscription;
    
    const handleAuctionUpdate = (payload) => {
      console.log('Real-time auction update in details page:', payload);
      
      if (payload.table === 'bids') {
        // Update current bid if this is a new bid for our auction
        if (payload.new && payload.new.auction_id === auction.id) {
          setCurrentBid(payload.new.amount);
          // Refresh full auction data to get updated bid history
          fetchAuctionData(false);
        }
      }
      
      if (payload.table === 'auctions' && payload.new) {
        // Update auction data if needed
        // Note: current_price column doesn't exist in current schema
        // We'll rely on the bids table for current bid updates
      }
    };

    // Subscribe to real-time updates for this auction
    subscription = auctionService.subscribeToAuction(auction.id, handleAuctionUpdate);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [auction?.id, fetchAuctionData]);

  const handlePlaceBid = async (amount) => {
    console.log('🔥 AUCTION DETAILS - handlePlaceBid called with amount:', amount);
    console.log('🔍 Auction state:', { auctionId: auction?.id, isAuthenticated });
    
    if (!auction?.id) {
      console.log('❌ No auction available');
      return Promise.reject('No auction available');
    }
    if (!isAuthenticated) {
      console.log('❌ User not authenticated, redirecting to signin');
      router.push('/auth/signin');
      return Promise.reject('Please sign in to place a bid');
    }
    
    try {
      console.log('🚀 Calling auctionService.placeBid...');
      await auctionService.placeBid(auction.id, amount);
      console.log('✅ auctionService.placeBid completed successfully');
      setCurrentBid(amount);
      
      // Refresh auction data to get updated bid history
      // Add a small delay to allow database to process
      setTimeout(() => {
        fetchAuctionData(false);
      }, 1000);
    } catch (err) {
      console.error('❌ auctionService.placeBid failed:', err);
      throw new Error(err.message || 'Failed to place bid');
    }
  };

  const handleFollow = async (sellerId) => {
    if (!sellerId) return Promise.reject('No seller ID provided');
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return Promise.reject('Please sign in to follow sellers');
    }
    
    // TODO: Implement follow/unfollow functionality with Supabase
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsFollowing(!isFollowing);
        resolve();
      }, 500);
    });
  };

  const handleRefresh = () => {
    fetchAuctionData(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-muted rounded w-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-muted rounded-xl"></div>
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-16">
            <Icon name="AlertCircle" size={48} className="text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Error Loading Auction</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Go Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  // No auction found
  if (!auction) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-16">
            <Icon name="Search" size={48} className="text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Auction Not Found</h1>
            <p className="text-muted-foreground mb-6">The auction you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => router.push('/auction-listings')}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Browse Other Auctions
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Breadcrumb customItems={[
            { label: 'Home', path: '/home-page' },
            { label: 'Auctions', path: '/auction-listings' },
            { label: auction?.title || 'Loading...', isActive: true }
          ]} />
          
          {/* Refresh Button - Shows when realtime is disabled */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              <Icon 
                name="RefreshCw" 
                size={16} 
                className={`${refreshing ? 'animate-spin' : ''} text-muted-foreground`} 
              />
              <span className="text-muted-foreground">
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
            
            {/* Live indicator */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">
                Polling updates
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          <div className="space-y-6">
            <ImageGallery images={auction?.images} title={auction?.title} />
            
            <ExpandableSection title="Description" defaultExpanded>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p className="whitespace-pre-wrap">{auction?.description}</p>
              </div>
            </ExpandableSection>
          </div>

          <div className="space-y-6">
            <div className="sticky top-6">
              <AuctionInfo auction={auction} />
              <CountdownTimer endTime={auction?.endTime} />
              <BiddingPanel
                auction={auction}
                currentBid={currentBid}
                onPlaceBid={handlePlaceBid}
                isAuthenticated={isAuthenticated}
              />
              <SellerInfo
                seller={auction?.seller}
                isFollowing={isFollowing}
                onFollow={handleFollow}
                isAuthenticated={isAuthenticated}
              />
              <PaymentSecurity />
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-8">
          <BidHistory bids={auction?.bids} />
        </div>
      </main>
    </div>
  );
};

export default AuctionDetails;