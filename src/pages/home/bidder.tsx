"use client";
import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Header from "../../components/ui/Header";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import BidcoinSummaryCard from "../../components/BidcoinSummaryCard";
import ReferralCard from "../../components/ReferralCard";
import Image from "../../components/AppImage";

interface Auction {
  id: string;
  title: string;
  current_price: number;
  starting_price: number;
  end_time: string;
  status: string;
  primary_image?: string | null;
}

interface Bid {
  id: string;
  auction_id: string;
  amount: number;
  status: string;
  created_at: string;
  auctions?: {
    title: string;
    status: string;
    end_time: string;
    primary_image?: string | null;
  };
}

interface BidderStats {
  activeBids: number;
  winningBids: number;
  totalBids: number;
  totalSpent: number;
}

export default function BidderHomePage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<BidderStats>({
    activeBids: 0,
    winningBids: 0,
    totalBids: 0,
    totalSpent: 0,
  });
  const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (userProfile?.user_role === "seller") {
      router.push("/home/seller");
      return;
    }

    fetchBidderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, authLoading, router]);

  const fetchBidderData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch active auctions
      const auctionsRes = await fetch("/api/auctions?status=active&limit=6");
      const auctionsData = await auctionsRes.json();
      setActiveAuctions(auctionsData.auctions || []);

      // Fetch user's bids
      const bidsRes = await fetch(`/api/bids?user_id=${user.id}`);
      const bidsData = await bidsRes.json();
      const allBids = bidsData.bids || [];
      setMyBids(allBids.slice(0, 5)); // Show recent 5 bids

      // Calculate stats
      const activeBids = allBids.filter(
        (b: Bid) => b.status === "active" || b.status === "winning"
      );
      const winningBids = allBids.filter((b: Bid) => b.status === "winning");
      const totalSpent = allBids.reduce((sum: number, bid: Bid) => {
        if (bid.status === "winning" || bid.status === "active") {
          return sum + (bid.amount || 0);
        }
        return sum;
      }, 0);

      setStats({
        activeBids: activeBids.length,
        winningBids: winningBids.length,
        totalBids: allBids.length,
        totalSpent: totalSpent,
      });
    } catch (error) {
      console.error("Error fetching bidder data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = Math.max(0, end.getTime() - now.getTime());

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatPrice = (price: number) => {
    // Prices are stored in dollars (DECIMAL(10,2)), so do NOT divide by 100.
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price || 0);
  };

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case "winning":
        return "text-success bg-success/10 border-success/30";
      case "active":
        return "text-primary bg-primary/10 border-primary/30";
      case "outbid":
        return "text-error bg-error/10 border-error/30";
      default:
        return "text-muted-foreground bg-muted/40 border-border/60";
    }
  };

  const getBidStatusLabel = (status: string) => {
    switch (status) {
      case "winning":
        return "Winning";
      case "active":
        return "Active";
      case "outbid":
        return "Outbid";
      default:
        return status;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">
              Loading your bidder homepage...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Bidder Home - BidWin</title>
        <meta
          name="description"
          content="Browse auctions, place bids, and win amazing deals on BidWin"
        />
      </Head>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 lg:px-6 py-8 space-y-10">
          {/* Top section: welcome + quick actions + stats */}
          <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
            {/* Left column */}
            <div className="space-y-6">
              {/* Welcome */}
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                  Welcome back,{" "}
                  {userProfile?.name ||
                    user?.email?.split("@")[0] ||
                    "Bidder"}
                  !
                </h1>
                <p className="text-muted-foreground">
                  Discover amazing deals, place competitive bids, and win items
                  you love.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="bg-card border border-border rounded-xl p-5 lg:p-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Quick Actions
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Jump straight to the pages you use the most.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="default"
                    fullWidth
                    onClick={() => router.push("/auction-listings")}
                    iconName="Search"
                    iconPosition="left"
                    className="justify-start"
                  >
                    Browse All Bids
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => router.push("/bid-history")}
                    iconName="History"
                    iconPosition="left"
                    className="justify-start"
                  >
                    View Bid History
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => router.push("/dashboard/bidder")}
                    iconName="LayoutDashboard"
                    iconPosition="left"
                    className="justify-start"
                  >
                    View Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => router.push("/raffles")}
                    iconName="Ticket"
                    iconPosition="left"
                    className="justify-start"
                  >
                    Browse Raffles
                  </Button>
                </div>
              </div>
            </div>

            {/* Right column - Stats */}
            <div className="bg-card border border-border rounded-xl p-5 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Your Bidding Snapshot
                </h2>
                <Icon name="TrendingUp" size={20} className="text-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/60 bg-muted/40 p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Active Bids
                    </span>
                    <Icon name="Gavel" size={18} className="text-primary" />
                  </div>
                  <span className="text-2xl font-bold text-foreground">
                    {stats.activeBids}
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/40 p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Winning
                    </span>
                    <Icon name="Trophy" size={18} className="text-success" />
                  </div>
                  <span className="text-2xl font-bold text-foreground">
                    {stats.winningBids}
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/40 p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Bids
                    </span>
                    <Icon
                      name="TrendingUp"
                      size={18}
                      className="text-warning"
                    />
                  </div>
                  <span className="text-2xl font-bold text-foreground">
                    {stats.totalBids}
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/40 p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Spent
                    </span>
                    <Icon
                      name="DollarSign"
                      size={18}
                      className="text-error"
                    />
                  </div>
                  <span className="text-lg font-bold text-foreground">
                    {formatPrice(stats.totalSpent)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* BidCoins + Referral as ONE card */}
          <section className="mb-2">
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">
                  Your BidCoins & Referrals
                </h2>
                <p className="text-xs text-muted-foreground">
                  Use your BidCoins and invite friends from one place.
                </p>
              </div>

              {/* BidCoins summary */}
              <BidcoinSummaryCard />

              {/* Referral below with divider */}
              <div className="border-t border-border/60 pt-6">
                <ReferralCard />
              </div>
            </div>
          </section>

          {/* Featured Bids */}
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-1 gap-3">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Featured Bids
                </h2>
                <p className="text-sm text-muted-foreground">
                  Handpicked auctions that are ending soon or getting attention.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/auction-listings")}
                iconName="ArrowRight"
                iconPosition="right"
              >
                View All
              </Button>
            </div>

            {activeAuctions.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <Icon
                  name="Gavel"
                  size={48}
                  className="text-muted-foreground mx-auto mb-4"
                />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Active Auctions
                </h3>
                <p className="text-muted-foreground mb-4">
                  Check back soon for new auctions!
                </p>
                <Button
                  variant="default"
                  onClick={() => router.push("/auction-listings")}
                  iconName="Search"
                  iconPosition="left"
                >
                  Browse Auctions
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAuctions.map((auction) => (
                  <div
                    key={auction.id}
                    className="group flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:border-primary/60 transition-all cursor-pointer"
                    onClick={() =>
                      router.push(`/auction-details/${auction.id}`)
                    }
                  >
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      <Image
                        src={
                          auction.primary_image || "/placeholder-auction.jpg"
                        }
                        alt={auction.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    <div className="flex flex-col flex-1 p-4">
                      {/* fixed-height title so cards stay equal */}
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2 min-h-[3rem]">
                        {auction.title}
                      </h3>

                      {/* footer pushed to bottom */}
                      <div className="mt-auto space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Current Bid
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {formatPrice(auction.current_price || 0)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            <Icon
                              name="Clock"
                              size={14}
                              className="inline mr-1"
                            />
                            {formatTimeRemaining(auction.end_time)}
                          </span>
                        </div>

                        <Button
                          variant="default"
                          size="sm"
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/auction-details/${auction.id}`);
                          }}
                          className="mt-3"
                        >
                          Place Bid
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Bids */}
          {myBids.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Your Recent Bids
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Track how your latest bids are performing in real time.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/bid-history")}
                  iconName="ArrowRight"
                  iconPosition="right"
                >
                  View All
                </Button>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {myBids.map((bid) => (
                    <div
                      key={bid.id}
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() =>
                        bid.auctions &&
                        router.push(`/auction-details/${bid.auction_id}`)
                      }
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {bid.auctions?.title || "Auction"}
                            </h3>
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-full border ${getBidStatusColor(
                                bid.status
                              )}`}
                            >
                              {getBidStatusLabel(bid.status)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span>Bid: {formatPrice(bid.amount || 0)}</span>
                            {bid.auctions?.end_time && (
                              <span>
                                <Icon
                                  name="Clock"
                                  size={14}
                                  className="inline mr-1"
                                />
                                {formatTimeRemaining(bid.auctions.end_time)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/auction-details/${bid.auction_id}`);
                          }}
                          iconName="ArrowRight"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* CTA Section */}
          <section>
            <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Place More Bids?
              </h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Discover new auctions, track your bids, and win amazing deals.
                Use your BidCoins to save on every bid!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => router.push("/auction-listings")}
                  iconName="Search"
                  iconPosition="left"
                  className="bg-white text-primary hover:bg-gray-100 px-8 py-3"
                >
                  Browse All Bids
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/bid-history")}
                  iconName="History"
                  iconPosition="left"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20 px-8 py-3"
                >
                  View Bid History
                </Button>
              </div>
            </div>
          </section>

          {/* Bidding Tips */}
          <section className="bg-gradient-to-r from-primary/10 to-blue-600/10 border border-primary/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
              <Icon name="Lightbulb" size={20} className="mr-2 text-primary" />
              Bidding Tips
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Icon
                  name="CheckCircle"
                  size={20}
                  className="text-success mt-0.5"
                />
                <div>
                  <h3 className="font-medium text-foreground mb-1">
                    Set Your Max Bid
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Decide your maximum bid before the auction ends to avoid
                    overbidding.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon
                  name="CheckCircle"
                  size={20}
                  className="text-success mt-0.5"
                />
                <div>
                  <h3 className="font-medium text-foreground mb-1">
                    Watch the Timer
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Place your bids early, but be ready to bid again if you're
                    outbid near the end.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon
                  name="CheckCircle"
                  size={20}
                  className="text-success mt-0.5"
                />
                <div>
                  <h3 className="font-medium text-foreground mb-1">
                    Use BidCoins
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Save money by using BidCoins for bids. Earn more with every
                    purchase!
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon
                  name="CheckCircle"
                  size={20}
                  className="text-success mt-0.5"
                />
                <div>
                  <h3 className="font-medium text-foreground mb-1">
                    Read Descriptions
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Carefully review item descriptions and images before placing
                    bids.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
