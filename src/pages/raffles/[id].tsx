import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Header from '../../components/ui/Header'
import Button from '../../components/ui/Button'
import Icon from '../../components/AppIcon'
import { useAuth } from '../../contexts/AuthContext'
import { loadStripe, type Stripe, type StripeElements, type StripePaymentElement } from '@stripe/stripe-js';
import { useBidcoins } from '../../hooks/useBidcoins'

interface RaffleDetail {
  id: string
  seller_id: string
  title: string
  description?: string | null
  ticket_price: number
  max_entries: number
  end_time: string
  status: 'draft' | 'active' | 'ended' | 'cancelled'
}

interface RaffleImageRow {
  id?: string
  image_url: string
  is_primary?: boolean
  alt_text?: string | null
}

export default function RaffleDetailPage() {
  const router = useRouter()
  const { id } = router.query as { id?: string }

  const [raffle, setRaffle] = useState<RaffleDetail | null>(null)
  const [images, setImages] = useState<RaffleImageRow[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [count, setCount] = useState<number>(0)
  const [userEntriesCount, setUserEntriesCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user, userProfile } = useAuth()

  const [quantity, setQuantity] = useState(1)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [elements, setElements] = useState<StripeElements | null>(null)
  const [stripe, setStripe] = useState<Stripe | null>(null)
  const paymentElementRef = useRef<StripePaymentElement | null>(null)
  const [paymentMounted, setPaymentMounted] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [purchased, setPurchased] = useState(false)
  const [purchaseInProgress, setPurchaseInProgress] = useState(false)
  const [useBidcoinPayment, setUseBidcoinPayment] = useState(false)

  const { data: bidcoinData, loading: bidcoinLoading, refresh: refreshBidcoins } = useBidcoins()

  const stripePromise = useMemo(() => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string), [])

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        setLoading(true)
        const [raffleRes, entriesRes] = await Promise.all([
          fetch(`/api/raffles/${id}`),
          fetch(`/api/raffles/${id}/entries${user?.id ? `?userId=${user.id}` : ''}`),
        ])
        const raffleJson = await raffleRes.json()
        const entriesJson = await entriesRes.json()
        if (!raffleRes.ok) throw new Error(raffleJson.error || 'Failed to load raffle')
        setRaffle(raffleJson.raffle)
        const imgs: RaffleImageRow[] = raffleJson.images || []
        setImages(imgs)
        const primaryIdx = Math.max(0, imgs.findIndex((i)=>i.is_primary))
        setSelectedIndex(primaryIdx === -1 ? 0 : primaryIdx)
        setCount(entriesJson.count || 0)
        if (entriesJson.userEntries) setUserEntriesCount(entriesJson.userEntries.length)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user?.id])

  const remaining = useMemo(() => {
    if (!raffle) return 0
    return Math.max(0, raffle.max_entries - count)
  }, [raffle, count])

  const percentSold = useMemo(() => {
    if (!raffle || raffle.max_entries === 0) return 0
    return Math.min(100, Math.round((count / raffle.max_entries) * 100))
  }, [raffle, count])

  const coinsRequired = useMemo(
    () => (raffle ? raffle.ticket_price * quantity : 0),
    [raffle, quantity]
  )

  const hasEnoughBidcoins = useMemo(() => {
    const balance = bidcoinData?.balance ?? 0
    return balance >= coinsRequired
  }, [bidcoinData?.balance, coinsRequired])

  useEffect(() => {
    if (useBidcoinPayment) {
      if (paymentElementRef.current?.unmount) {
        paymentElementRef.current.unmount()
      }
      paymentElementRef.current = null
      setPaymentMounted(false)
      setClientSecret(null)
      setElements(null)
      setStripe(null)
    }
  }, [useBidcoinPayment])

  useEffect(() => {
    if (useBidcoinPayment && !hasEnoughBidcoins) {
      setUseBidcoinPayment(false)
    }
  }, [useBidcoinPayment, hasEnoughBidcoins])

  const beginPurchase = async () => {
    if (!raffle || !id) return
    if (userEntriesCount > 0) {
      setPaymentError('You already have entries for this raffle.')
      return
    }
    setPaymentError(null)
    setSuccessMsg(null)

    try {
      if (clientSecret || purchaseInProgress) return
      setPurchaseInProgress(true)
      const res = await fetch(`/api/raffles/${id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, useBidcoins: useBidcoinPayment })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create payment')

      // Handle BidCoin-only purchase flow
      if (useBidcoinPayment || data.bidcoinPayment) {
        setPurchased(true)
        setSuccessMsg('BidCoin payment succeeded! Your entries have been added.')
        refreshBidcoins().catch(() => {})

        // Refresh raffle entry counts for the user
        try {
          const entriesRes = await fetch(`/api/raffles/${id}/entries${user?.id ? `?userId=${user.id}` : ''}`)
          const entriesJson = await entriesRes.json()
          setCount(entriesJson.count || 0)
          if (entriesJson.userEntries) setUserEntriesCount(entriesJson.userEntries.length)
        } catch (entriesError) {
          console.error('Failed to refresh raffle entries after BidCoin purchase', entriesError)
        }

        return
      }

      if (!data.clientSecret) {
        throw new Error('Missing payment credentials from server')
      }

      setClientSecret(data.clientSecret)

      const stripeInstance = await stripePromise
      if (!stripeInstance) throw new Error('Stripe failed to initialize')
      setStripe(stripeInstance)

      const els = stripeInstance.elements({ clientSecret: data.clientSecret })
      setElements(els)
      // Mounting is handled in effect when clientSecret/elements are ready
    } catch (e: unknown) {
      setPaymentError(e instanceof Error ? e.message : String(e))
    } finally {
      setPurchaseInProgress(false)
    }
  }

  const confirmPayment = async () => {
    if (!stripe || !elements || !clientSecret || !paymentElementRef.current || !paymentMounted) {
      setPaymentError('Payment form not ready yet. Click "Start Payment" and wait for the card form to appear.')
      return
    }

    // Ensure the element has finished initialization and surface validation errors early
    const submitResult = await elements.submit()
    if (submitResult?.error) {
      setPaymentError(submitResult.error.message || 'Please check your payment details.')
      return
    }
    setProcessing(true)
    setPaymentError(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required'
      })

      if (error) {
        setPaymentError(error.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Finalize (dev-safe) to insert entries if webhook isn't running
        try {
          await fetch(`/api/raffles/${id}/purchase/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id })
          })
        } catch {}

        setSuccessMsg('Payment succeeded! Your entries have been added.')
        setPurchased(true)
        refreshBidcoins().catch(() => {})
        // refresh entries count
        const entriesRes = await fetch(`/api/raffles/${id}/entries${user?.id ? `?userId=${user.id}` : ''}`)
        const entriesJson = await entriesRes.json()
        setCount(entriesJson.count || 0)
        if (entriesJson.userEntries) setUserEntriesCount(entriesJson.userEntries.length)
        // Unmount payment element to avoid reuse
        if (paymentElementRef.current?.unmount) {
          paymentElementRef.current.unmount()
          paymentElementRef.current = null
          setPaymentMounted(false)
        }
      } else {
        setPaymentError(`Payment status: ${paymentIntent?.status}`)
      }
    } catch (e: unknown) {
      setPaymentError(e instanceof Error ? e.message : String(e))
    } finally {
      setProcessing(false)
    }
  }

  // Mount Payment Element after the clientSecret block renders
  useEffect(() => {
    if (!clientSecret || !elements) return
    const mount = () => {
      const container = document.getElementById('raffle-payment-element')
      if (!container) return
      // Unmount previous element if present
      if (paymentElementRef.current?.unmount) {
        paymentElementRef.current.unmount()
      }
      paymentElementRef.current = elements.create('payment', { layout: 'tabs' })
      paymentElementRef.current.mount('#raffle-payment-element')
      setPaymentMounted(true)
    }
    // Defer to ensure DOM updated
    const id = window.requestAnimationFrame(mount)
    return () => {
      window.cancelAnimationFrame(id)
      if (paymentElementRef.current?.unmount) {
        paymentElementRef.current.unmount()
        paymentElementRef.current = null
        setPaymentMounted(false)
      }
    }
  }, [clientSecret, elements])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96 text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              <span>Loading raffle...</span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !raffle) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            {error || 'Raffle not found'}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <button className="text-sm text-muted-foreground hover:text-foreground flex items-center" onClick={() => router.back()}>
            <Icon name="ArrowLeft" size={16} className="mr-1" /> Back
          </button>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">{raffle.title}</h1>
        {raffle.description && (
          <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{raffle.description}</p>
        )}

        {/* Image gallery */}
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {images.length > 0 && (
              <div className="mb-6">
                <div className="aspect-video bg-card border border-border rounded-lg overflow-hidden">
                  <img src={images[selectedIndex]?.image_url || images[0].image_url} alt="Raffle image" className="w-full h-full object-cover" />
                </div>
                {images.length > 1 && (
                  <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {images.map((img, idx) => (
                      <button
                        key={img.id || idx}
                        onClick={() => setSelectedIndex(idx)}
                        className={`h-16 border rounded overflow-hidden focus:outline-none ${selectedIndex === idx ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/60'}`}
                        aria-label={`Show image ${idx+1}`}
                      >
                        <img src={img.image_url} alt={img.alt_text || `Thumb ${idx+1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {raffle.description && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">About this raffle</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{raffle.description}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-accent text-accent-foreground capitalize">{raffle.status}</span>
              <span className="text-sm text-muted-foreground">Ends {new Date(raffle.end_time).toLocaleString()}</span>
            </div>
            <div className="space-y-3 text-sm text-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon name="Ticket" size={16} />
                  <span>Ticket price</span>
                </div>
                <span className="font-semibold">${(raffle.ticket_price / 100).toFixed(2)} USD</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <Icon name="Users" size={16} />
                    <span>Sold</span>
                  </div>
                  <span className="text-sm font-medium">{count} / {raffle.max_entries} ({percentSold}%)</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${percentSold}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Buy tickets</h3>
            <p className="text-sm text-muted-foreground mb-3">Choose quantity and pay securely with Stripe.</p>

            {raffle.status !== 'active' || remaining === 0 ? (
              <div className="text-sm text-muted-foreground">This raffle is not open for purchase.</div>
            ) : raffle.seller_id === user?.id ? (
              <div className="text-sm text-muted-foreground">Sellers cannot purchase entries for their own raffle.</div>
            ) : purchased || userEntriesCount > 0 ? (
              <div className="text-sm text-success">You already have {userEntriesCount} entries for this raffle.</div>
            ) : (
              <>
                <label className="block text-sm text-foreground mb-2">Quantity (remaining: {remaining})</label>
                <input
                  type="number"
                  min={1}
                  max={remaining}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(remaining, Number(e.target.value) || 1)))}
                  className="w-full border border-border rounded-md bg-background px-3 py-2 mb-3"
                />
                <div className="flex items-center justify-between mb-3 text-sm">
                  <span>Total</span>
                  <span className="font-semibold">${((raffle.ticket_price * quantity) / 100).toFixed(2)} USD</span>
                </div>
                <div className="border border-border rounded-lg px-3 py-2 bg-muted/10 mb-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={useBidcoinPayment}
                        onChange={(event) => setUseBidcoinPayment(event.target.checked)}
                        disabled={bidcoinLoading || !hasEnoughBidcoins}
                      />
                      Pay with BidCoins
                    </label>
                    <span className="text-xs text-muted-foreground">
                      Balance:{' '}
                      {bidcoinLoading
                        ? '...'
                        : `${bidcoinData?.balance ?? 0} coins (≈ $${(bidcoinData?.usdValue ?? 0).toFixed(2)})`}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                    <span>Required: {coinsRequired} coins (≈ ${((coinsRequired / 100)).toFixed(2)})</span>
                    {!hasEnoughBidcoins && (
                      <span className="text-destructive">Insufficient BidCoins</span>
                    )}
                  </div>
                  {!useBidcoinPayment && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Earn 5% back in BidCoins on every raffle purchase.
                    </p>
                  )}
                </div>
                <Button
                  fullWidth
                  onClick={beginPurchase}
                  iconName={useBidcoinPayment ? 'Coins' : 'CreditCard'}
                  disabled={
                    purchaseInProgress ||
                    (!!clientSecret && !useBidcoinPayment) ||
                    (useBidcoinPayment && !hasEnoughBidcoins)
                  }
                >
                  {purchaseInProgress
                    ? 'Preparing…'
                    : useBidcoinPayment
                    ? 'Pay with BidCoins'
                    : 'Start Payment'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {useBidcoinPayment
                    ? 'This purchase will deduct BidCoins from your balance instantly.'
                    : 'You’ll complete payment securely with Stripe.'}
                </p>
              </>
            )}
          </div>
        </div>

        </div>

        {clientSecret && !purchased && !useBidcoinPayment && (
          <div className="mt-6 bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Payment</h3>
            <div id="raffle-payment-element" className="border border-border rounded-lg p-3 bg-background" />
            {paymentError && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {paymentError}
              </div>
            )}
            {successMsg && (
              <div className="mt-3 p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">
                {successMsg}
              </div>
            )}
            <div className="mt-4">
              <Button onClick={confirmPayment} loading={processing} iconName="CheckCircle" fullWidth>
                {processing ? 'Processing...' : 'Pay and Confirm'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}