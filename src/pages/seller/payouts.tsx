import React, { useEffect, useState } from 'react'
import Header from '../../components/ui/Header'
import Button from '../../components/ui/Button'
import Icon from '../../components/AppIcon'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'

interface PayoutSummary {
  total_completed: number
  allocated_total: number
  available: number
  stripe_account_id?: string | null
}

interface PayoutRow {
  id: string
  status: 'requested' | 'processing' | 'paid' | 'failed' | 'cancelled'
  amount_total: number
  currency: string
  requested_at: string
  processed_at?: string | null
  paid_at?: string | null
}

export default function SellerPayoutsPage() {
  const router = useRouter()
  const { user, userProfile, loading } = useAuth()
  const [summary, setSummary] = useState<PayoutSummary | null>(null)
  const [payouts, setPayouts] = useState<PayoutRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!user || userProfile?.user_role !== 'seller')) {
      router.push('/auth/login')
      return
    }
    if (user && userProfile?.user_role === 'seller') {
      fetchData()
    }
  }, [user, userProfile, loading])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/seller/payouts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load payouts')
      setSummary(data.summary)
      setPayouts(data.payouts || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const requestPayout = async () => {
    try {
      setRequesting(true)
      setError(null)
      const res = await fetch('/api/seller/payouts', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to request payout')
      await fetchData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRequesting(false)
    }
  }

  const formatAmount = (n?: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
  const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString() : '-'

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-medium text-foreground">Loading...</h2>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Payouts</h1>
          <p className="text-muted-foreground">Track available funds and request payouts to your connected Stripe account.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={20} className="text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </div>
        )}

        {!summary?.stripe_account_id && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon name="AlertTriangle" size={20} className="text-warning" />
                <p className="text-warning font-medium">Connect your bank account to receive payouts.</p>
              </div>
              <Button variant="outline" onClick={() => router.push('/seller/stripe-connect')} iconName="ExternalLink" iconPosition="right">Connect</Button>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-1">Total Completed</p>
            <p className="text-2xl font-semibold text-foreground">{formatAmount(summary?.total_completed)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-1">Allocated</p>
            <p className="text-2xl font-semibold text-foreground">{formatAmount(summary?.allocated_total)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Available</p>
              <Button size="sm" disabled={(summary?.available || 0) <= 0 || !summary?.stripe_account_id || requesting} onClick={requestPayout} iconName="Wallet" iconPosition="left">
                {requesting ? 'Requesting...' : 'Request Payout'}
              </Button>
            </div>
            <p className="text-2xl font-semibold text-success">{formatAmount(summary?.available)}</p>
          </div>
        </div>

        {/* Payouts list */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">History</h2>
            <Button variant="outline" size="sm" iconName="Download" iconPosition="left">Export</Button>
          </div>

          {payouts.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Wallet" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No payouts yet</h3>
              <p className="text-muted-foreground">Once you request payouts, they will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-2 pr-4">Payout ID</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Amount</th>
                    <th className="text-left py-2 pr-4">Requested</th>
                    <th className="text-left py-2 pr-4">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-3 pr-4 font-medium text-foreground">{p.id.slice(0, 8).toUpperCase()}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'paid' ? 'text-success bg-success/10' :
                          p.status === 'processing' ? 'text-primary bg-primary/10' :
                          p.status === 'requested' ? 'text-warning bg-warning/10' :
                          p.status === 'failed' ? 'text-destructive bg-destructive/10' : 'text-muted-foreground bg-muted'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{formatAmount(p.amount_total)}</td>
                      <td className="py-3 pr-4">{formatDate(p.requested_at)}</td>
                      <td className="py-3 pr-4">{formatDate(p.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}