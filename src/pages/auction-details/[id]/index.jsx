"use client";
import React, { useState, useEffect } from 'react';
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
  const auctionId = params.id;
  
  const [auction, setAuction] = useState(null);
  const [currentBid, setCurrentBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchAuctionData = async () => {
      if (!auctionId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const auctionData = await auctionService.getAuctionById(auctionId);
        setAuction(auctionData);
        setCurrentBid(auctionData.currentBid);
      } catch (err) {
        console.error('Error fetching auction:', err);
        setError('Failed to load auction details');
        
        // If auction not found, redirect to 404
        if (err.message?.includes('not found')) {
          router.push('/404');
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAuctionData();
  }, [auctionId, router]);

  const handlePlaceBid = async (amount) => {
    if (!auction?.id) return Promise.reject('No auction available');
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return Promise.reject('Please sign in to place a bid');
    }
    
    try {
      await auctionService.placeBid(auction.id, amount);
      setCurrentBid(amount);
      
      // Refresh auction data to get updated bid history
      const updatedAuction = await auctionService.getAuctionById(auctionId);
      setAuction(updatedAuction);
    } catch (err) {
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

  // ...existing JSX with auction data...
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumb customItems={[
          { label: 'Home', path: '/home-page' },
          { label: 'Auctions', path: '/auction-listings' },
          { label: auction.title, isActive: true }
        ]} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          <div className="space-y-6">
            <ImageGallery images={auction.images} title={auction.title} />
            
            <ExpandableSection title="Description" defaultExpanded>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p className="whitespace-pre-wrap">{auction.description}</p>
              </div>
            </ExpandableSection>
          </div>

          <div className="space-y-6">
            <div className="sticky top-6">
              <AuctionInfo auction={auction} />
              <CountdownTimer endTime={auction.endTime} />
              <BiddingPanel
                auction={auction}
                currentBid={currentBid}
                onPlaceBid={handlePlaceBid}
                isAuthenticated={isAuthenticated}
              />
              <SellerInfo
                seller={auction.seller}
                isFollowing={isFollowing}
                onFollow={handleFollow}
                isAuthenticated={isAuthenticated}
              />
              <PaymentSecurity />
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-8">
          <BidHistory bids={auction.bids} />
        </div>
      </main>
    </div>
  );
};

export default AuctionDetails;