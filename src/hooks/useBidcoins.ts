import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '../lib/supabase-browser'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

interface BidcoinData {
  balance: number
  usdValue: number
  transactions: any[]
}

export function useBidcoins() {
  const [data, setData] = useState<BidcoinData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())

  const fetchBidcoins = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/bidcoins/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) {
        if (response.status === 401) {
          setData(null)
          setLoading(false)
          return
        }
        throw new Error(await response.text())
      }

      const payload: BidcoinData = await response.json()
      setData(payload)
    } catch (err) {
      console.error('Failed to load BidCoin data', err)
      setError('Failed to load BidCoin balance')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBidcoins().catch(() => {})
  }, [fetchBidcoins])

  useEffect(() => {
    const supabase = supabaseRef.current
    // ✅ Fix: typed parameters for onAuthStateChange
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session) {
          fetchBidcoins().catch(() => {})
        } else {
          setData(null)
        }
      }
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [fetchBidcoins])

  return {
    data,
    loading,
    error,
    refresh: fetchBidcoins,
  }
}
