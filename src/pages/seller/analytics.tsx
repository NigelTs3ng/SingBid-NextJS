import React, { useEffect, useState } from 'react'
import Header from '../../components/ui/Header'
import Button from '../../components/ui/Button'
import Icon from '../../components/AppIcon'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'

interface AnalyticsStats {
  totalAuctions: number
  activeAuctions: number
  completedAuctions: number
  cancelledAuctions: number
  totalRevenue: number
  totalBids: number
  averageBidsPerAuction: number
  averageSellingPrice: number
  totalEarnings: number
  totalFeesCollected: number
}

export default function SellerAnalyticsPage() {
  const router = useRouter()
  const { user, userProfile, loading } = useAuth()
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [activeAuctions, setActiveAuctions] = useState<any[]>([])
  const [endedAuctions, setEndedAuctions] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!user || userProfile?.user_role !== 'seller')) {
      router.push('/auth/login')
      return
    }
    if (user && userProfile?.user_role === 'seller') {
      fetchAnalytics()
    }
  }, [user, userProfile, loading])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/seller/analytics')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load analytics')
      setStats(data.stats)
      setActiveAuctions(data.auctionsByStatus?.active || [])
      setEndedAuctions(data.auctionsByStatus?.ended || [])
      setRecentActivity(data.recentActivity || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatAmount = (n?: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString() : '-'

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-medium text-foreground">Loading analytics...</h2>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">Track your auction performance and sales metrics</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={20} className="text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-1">Total Auctions</p>
            <p className="text-2xl font-semibold text-foreground">{stats?.totalAuctions}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-semibold text-success">{stats?.activeAuctions}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-1">Completed</p>
            <p className="text-2xl font-semibold text-blue-600">{stats?.completedAuctions}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-semibold text-foreground">{formatAmount(stats?.totalRevenue)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-1">Total Bids</p>
            <p className="text-2xl font-semibold text-foreground">{stats?.totalBids}</p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-1">Avg Bids/Auction</p>
            <p className="text-xl font-semibold text-foreground">{stats?.averageBidsPerAuction}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-1">Avg Selling Price</p>
            <p className="text-xl font-semibold text-foreground">{formatAmount(stats?.averageSellingPrice)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
            <p className="text-xl font-semibold text-success">{formatAmount(stats?.totalEarnings)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-1">Platform Fees</p>
            <p className="text-xl font-semibold text-foreground">{formatAmount(stats?.totalFeesCollected)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Auctions */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Active Auctions</h2>
            {activeAuctions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active auctions
              </div>
            ) : (
              <div className="space-y-3">
                {activeAuctions.map((auction) => (
                  <div key={auction.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-foreground line-clamp-1">{auction.title}</p>
                      <p className="text-sm font-semibold text-success">{formatAmount(auction.current_price)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{auction.bids_count} bids</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm text-foreground line-clamp-1">{activity.description}</p>
                      <p className="text-sm font-semibold text-primary">{formatAmount(activity.amount)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ended Auctions */}
        {endedAuctions.length > 0 && (
          <div className="mt-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Completed Auctions</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left py-2 pr-4">Title</th>
                      <th className="text-left py-2 pr-4">Final Price</th>
                      <th className="text-left py-2 pr-4">Revenue</th>
                      <th className="text-left py-2 pr-4">Bids</th>
                      <th className="text-left py-2 pr-4">Ended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endedAuctions.map((auction) => (
                      <tr key={auction.id} className="border-t border-border">
                        <td className="py-3 pr-4 font-medium text-foreground line-clamp-1">{auction.title}</td>
                        <td className="py-3 pr-4">{formatAmount(auction.final_price)}</td>
                        <td className="py-3 pr-4 text-success font-medium">{formatAmount(auction.revenue)}</td>
                        <td className="py-3 pr-4">{auction.bids_count}</td>
                        <td className="py-3 pr-4">{formatDate(auction.end_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <Button onClick={() => router.push('/dashboard/seller')} variant="outline">
            Back to Dashboard
          </Button>
          <Button onClick={() => router.push('/seller/payouts')}>
            View Payouts
          </Button>
        </div>
      </main>
    </div>
  )
}
