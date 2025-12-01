"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import Footer from '../../components/ui/Footer';
import HeroSection from '../../components/pages/home-page/HeroSection';
import RecentlyCompletedSection from '../../components/pages/home-page/RecentlyCompletedSection';
import TrustSignalsSection from '../../components/pages/home-page/TrustSignalsSection';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const GeneralHomePage = () => {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  
  // Redirect authenticated users to their role-specific homepages
  // Only redirect if we're not already on the homepage and user is authenticated
  useEffect(() => {
    if (authLoading) return;
    
    // Don't redirect if we're already on the homepage
    if (router.asPath === '/home-page') return;
    
    if (user && userProfile) {
      const role = userProfile.user_role?.toLowerCase();
      if (role === 'seller') {
        router.replace('/home/seller');
      } else if (role === 'bidder') {
        router.replace('/home/bidder');
      }
    }
  }, [user, userProfile, authLoading, router]);

  const [quickStats, setQuickStats] = useState([
    {
      icon: "Gavel",
      value: "...",
      label: "Active Auctions",
      color: "text-primary"
    },
    {
      icon: "Users",
      value: "...",
      label: "Registered Users",
      color: "text-success"
    },
    {
      icon: "DollarSign",
      value: "...",
      label: "Monthly Volume",
      color: "text-warning"
    },
    {
      icon: "TrendingUp",
      value: "...",
      label: "Success Rate",
      color: "text-error"
    }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomePageStats();
  }, []);

  const fetchHomePageStats = async () => {
    try {
      const response = await fetch('/api/auctions?status=active&limit=1');
      const auctionsData = await response.json();
      const activeCount = auctionsData.auctions?.length || 0;

      // Fetch stats from API if available, otherwise use defaults
      const statsResponse = await fetch('/api/stats');
      let stats = { users: 0, volume: 0, successRate: 0 };
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        stats = statsData;
      }

      setQuickStats([
        {
          icon: "Gavel",
          value: activeCount > 0 ? activeCount.toLocaleString() : "0",
          label: "Active Auctions",
          color: "text-primary"
        },
        {
          icon: "Users",
          value: stats.users > 0 ? stats.users.toLocaleString() : "1K+",
          label: "Registered Users",
          color: "text-success"
        },
        {
          icon: "DollarSign",
          value: stats.volume > 0 ? `$${(stats.volume / 1000).toFixed(0)}K` : "$100K+",
          label: "Monthly Volume",
          color: "text-warning"
        },
        {
          icon: "TrendingUp",
          value: stats.successRate > 0 ? `${stats.successRate}%` : "95%",
          label: "Success Rate",
          color: "text-error"
        }
      ]);
    } catch (error) {
      console.error('Error fetching homepage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth or redirecting
  if (authLoading || (user && userProfile)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>BidWin - Singapore's Premier Online Auction Platform | Buy & Sell</title>
        <meta name="description" content="BidWin is Singapore's leading online auction marketplace. Discover unique items, place competitive bids, and win amazing deals from verified sellers. Secure transactions with fast payouts." />
        <meta name="keywords" content="online auction Singapore, buy sell, online bidding, auction platform, collectibles" />
        <meta property="og:title" content="BidWin - Singapore's Premier Online Auction Platform" />
        <meta property="og:description" content="Discover unique items through secure auctions. Fast payouts, buyer protection, seller verification." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 lg:px-6 py-8">
          {/* Welcome Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-4">
              Welcome to <span className="text-primary">BidWin</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Singapore's premier online auction marketplace. Discover unique items, 
              place competitive bids, and win amazing deals from verified sellers across the island.
            </p>
            
            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
              <Button
                variant="default"
                size="lg"
                onClick={() => router.push('/auction-listings')}
                iconName="Search"
                iconPosition="left"
                className="px-8 py-3"
              >
                Browse All Auctions
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/auth/signup')}
                iconName="UserPlus"
                iconPosition="left"
                className="px-8 py-3"
              >
                Get Started Free
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {quickStats?.map((stat, index) => (
                <div key={index} className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon name={stat?.icon} size={20} className={stat?.color} />
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">{stat?.value}</div>
                  <div className="text-sm text-muted-foreground">{stat?.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Section with Featured Auctions */}
          <HeroSection />

          {/* How It Works Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="UserPlus" size={32} className="text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">1. Sign Up Free</h3>
                <p className="text-muted-foreground">
                  Create your account in seconds. Get 200 BidCoins free when you sign up!
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Gavel" size={32} className="text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">2. Browse & Bid</h3>
                <p className="text-muted-foreground">
                  Explore thousands of auctions. Place bids with BidCoins or your card.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Package" size={32} className="text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">3. Win & Receive</h3>
                <p className="text-muted-foreground">
                  Win auctions and receive your items. Secure payments, fast shipping.
                </p>
              </div>
            </div>
          </section>

          {/* Why BidWin Section */}
          <section className="mb-16 bg-card border border-border rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">Why Choose BidWin?</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="Shield" size={24} className="text-success" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Secure & Verified</h3>
                  <p className="text-muted-foreground">
                    All sellers are verified. Secure payment processing with buyer protection.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="Coins" size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">BidCoin Rewards</h3>
                  <p className="text-muted-foreground">
                    Earn BidCoins on every purchase. Use them to bid on future auctions.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="Zap" size={24} className="text-warning" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Fast Payouts</h3>
                  <p className="text-muted-foreground">
                    Sellers receive payments within 24 hours. No waiting, no hassle.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-error/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="Headphones" size={24} className="text-error" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">24/7 Support</h3>
                  <p className="text-muted-foreground">
                    Our support team is always ready to help. Get answers when you need them.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Recently Completed Section */}
          <RecentlyCompletedSection />

          {/* Trust Signals Section */}
          <TrustSignalsSection />

          {/* CTA Section */}
          <section className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-8 md:p-12 text-center text-white mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Bidding?</h2>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of users buying and selling on BidWin. Sign up now and get 200 BidCoins free!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/auth/signup')}
                iconName="UserPlus"
                iconPosition="left"
                className="bg-white text-primary hover:bg-gray-100 px-8 py-3"
              >
                Sign Up Free
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/auction-listings')}
                iconName="Search"
                iconPosition="left"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 px-8 py-3"
              >
                Browse Auctions
              </Button>
            </div>
          </section>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
};

export default GeneralHomePage;
