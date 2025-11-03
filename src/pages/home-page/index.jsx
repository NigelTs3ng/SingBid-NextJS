"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import HeroSection from '../../components/pages/home-page/HeroSection';
import FilterControls from '../../components/pages/home-page/FilterControls';
import ActiveAuctionsGrid from '../../components/pages/home-page/ActiveAuctionsGrid';
import RecentlyCompletedSection from '../../components/pages/home-page/RecentlyCompletedSection';
import TrustSignalsSection from '../../components/pages/home-page/TrustSignalsSection';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const HomePage = () => {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [filters, setFilters] = useState({
    category: 'all',
    sortBy: 'ending_soon',
    priceRange: 'all',
    timeRemaining: 'all'
  });
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
      // Get active auctions count
      const { count: activeAuctionsCount } = await supabase
        .from('auctions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get total users count
      const { count: totalUsersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get monthly volume (sum of all ended auction prices from this month)
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const { data: monthlyAuctions } = await supabase
        .from('auctions')
        .select('current_price')
        .eq('status', 'ended')
        .gte('end_time', firstDayOfMonth.toISOString());

      const monthlyVolume = monthlyAuctions?.reduce((sum, auction) => sum + (auction.current_price || 0), 0) || 0;

      // Get success rate (percentage of auctions that ended with bids)
      const { data: endedAuctions } = await supabase
        .from('auctions')
        .select('id, starting_price, current_price')
        .eq('status', 'ended');

      const successfulAuctions = endedAuctions?.filter(auction => 
        auction.current_price > auction.starting_price
      ).length || 0;
      
      const successRate = endedAuctions?.length > 0 
        ? ((successfulAuctions / endedAuctions.length) * 100).toFixed(1)
        : 0;

      setQuickStats([
        {
          icon: "Gavel",
          value: activeAuctionsCount?.toLocaleString() || "0",
          label: "Active Auctions",
          color: "text-primary"
        },
        {
          icon: "Users",
          value: totalUsersCount?.toLocaleString() || "0",
          label: "Registered Users",
          color: "text-success"
        },
        {
          icon: "DollarSign",
          value: `S$${(monthlyVolume / 1000).toFixed(0)}K`,
          label: "Monthly Volume",
          color: "text-warning"
        },
        {
          icon: "TrendingUp",
          value: `${successRate}%`,
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

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 lg:px-6 py-8">
        <Breadcrumb />
        
        {/* Welcome Section */}
        <div className="text-center mb-12">
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
            {/* Only show Start Selling button to sellers or unauthenticated users */}
            {(!user || userProfile?.user_role === 'seller') && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/create-auction')}
                iconName="Plus"
                iconPosition="left"
                className="px-8 py-3"
              >
                Start Selling
              </Button>
            )}
          </div>

          {/* Quick Stats - Hidden on mobile */}
          <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
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

        {/* Filter Controls */}
        <FilterControls 
          onFilterChange={handleFilterChange}
          activeFilters={filters}
        />

        {/* Active Auctions Grid */}
        <ActiveAuctionsGrid filters={filters} />

        {/* Recently Completed Section */}
        <RecentlyCompletedSection />

        {/* Trust Signals Section */}
        <TrustSignalsSection />

        {/* Newsletter Signup */}
        <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-8 text-center text-white mb-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Never Miss a Great Deal</h2>
            <p className="text-lg mb-6 opacity-90">
              Get notified about new auctions, ending soon alerts, and exclusive deals 
              from your favorite categories.
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-4 py-3 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <Button
                variant="secondary"
                size="lg"
                iconName="Mail"
                iconPosition="left"
                className="bg-white text-primary hover:bg-gray-100"
              >
                Subscribe
              </Button>
            </div>
            <p className="text-sm opacity-75 mt-4">
              Join 15,000+ users who get the best auction alerts. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="container mx-auto px-4 lg:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Icon name="Gavel" size={20} color="white" />
                </div>
                <span className="text-xl font-bold text-foreground">BidWin</span>
              </div>
              <p className="text-muted-foreground">
                Singapore's trusted online auction marketplace connecting buyers and sellers 
                across the island nation.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm" iconName="Facebook" className="p-2" />
                <Button variant="ghost" size="sm" iconName="Twitter" className="p-2" />
                <Button variant="ghost" size="sm" iconName="Instagram" className="p-2" />
                <Button variant="ghost" size="sm" iconName="Linkedin" className="p-2" />
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
              <div className="space-y-2">
                <a href="/auction-listings" className="block text-muted-foreground hover:text-foreground transition-colors">Browse Auctions</a>
                <a href="/create-auction" className="block text-muted-foreground hover:text-foreground transition-colors">Sell Items</a>
                <a href="/subscription-management" className="block text-muted-foreground hover:text-foreground transition-colors">Premium Plans</a>
                <a href="/payment-dashboard" className="block text-muted-foreground hover:text-foreground transition-colors">Payment Center</a>
              </div>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Support</h3>
              <div className="space-y-2">
                <a href="/help" className="block text-muted-foreground hover:text-foreground transition-colors">Help Center</a>
                <a href="/contact" className="block text-muted-foreground hover:text-foreground transition-colors">Contact Us</a>
                <a href="/safety" className="block text-muted-foreground hover:text-foreground transition-colors">Safety Tips</a>
                <a href="/disputes" className="block text-muted-foreground hover:text-foreground transition-colors">Dispute Resolution</a>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <div className="space-y-2">
                <a href="/terms" className="block text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a>
                <a href="/privacy" className="block text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
                <a href="/cookies" className="block text-muted-foreground hover:text-foreground transition-colors">Cookie Policy</a>
                <a href="/licenses" className="block text-muted-foreground hover:text-foreground transition-colors">Business Licenses</a>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8 mt-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Â© {new Date()?.getFullYear()} BidWin Pte Ltd. All rights reserved. 
                Licensed by ACRA (Registration: 202400001A)
              </p>
              <div className="flex items-center space-x-4 mt-4 md:mt-0">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Icon name="MapPin" size={16} />
                  <span>Made in Singapore</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Icon name="Shield" size={16} />
                  <span>SSL Secured</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;