import { supabase } from '../utils/supabaseClient'
import { Database } from '../types/supabase'

type Auction = Database['public']['Tables']['auctions']['Row']
type AuctionInsert = Database['public']['Tables']['auctions']['Insert']
type Bid = Database['public']['Tables']['bids']['Row']
type BidInsert = Database['public']['Tables']['bids']['Insert']

export const auctionService = {
  // Create a new auction
  async createAuction(auctionData: Omit<AuctionInsert, 'seller_id'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('auctions')
      .insert({
        ...auctionData,
        seller_id: user.id,
        current_price: auctionData.starting_price || 0
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get all active auctions
  async getActiveAuctions() {
    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        users!seller_id (email),
        bids (
          id,
          amount,
          created_at,
          users!bidder_id (email)
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get auction by ID
  async getAuctionById(id: string) {
    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        users!seller_id (email),
        bids (
          id,
          amount,
          created_at,
          users!bidder_id (email)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Place a bid on an auction
  async placeBid(auctionId: string, amount: number) {
    console.log('🔥 [SERVICE] placeBid called with:', { auctionId, amount })
    
    const { data: { user } } = await supabase.auth.getUser()
    console.log('👤 [SERVICE] Current user from auth:', user ? { id: user.id, email: user.email } : 'null')
    
    if (!user) {
      console.log('❌ [SERVICE] User not authenticated')
      throw new Error('Not authenticated')
    }

    console.log('🔍 [SERVICE] Fetching current auction data...')
    // Get current auction data
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('current_price, status, end_time, seller_id')
      .eq('id', auctionId)
      .single()

    console.log('🏛️ [SERVICE] Auction query result:', { auction, error: auctionError })

    if (auctionError) {
      console.log('❌ [SERVICE] Error fetching auction:', auctionError)
      throw auctionError
    }
    
    console.log('✅ [SERVICE] Auction data retrieved:', auction)
    console.log('📊 [SERVICE] Auction status check:', auction.status)
    console.log('⏰ [SERVICE] Time check - end_time:', auction.end_time, 'current:', new Date().toISOString())
    console.log('💰 [SERVICE] Price check - current:', auction.current_price, 'bid:', amount)
    console.log('👥 [SERVICE] Owner check - seller_id:', auction.seller_id, 'bidder_id:', user.id)

    if (auction.status !== 'active') {
      console.log('❌ [SERVICE] Auction is not active, status:', auction.status)
      throw new Error('Auction is not active')
    }
    
    if (new Date(auction.end_time) < new Date()) {
      console.log('❌ [SERVICE] Auction has ended')
      throw new Error('Auction has ended')
    }
    
    if (amount <= auction.current_price) {
      console.log('❌ [SERVICE] Bid amount too low')
      throw new Error('Bid must be higher than current price')
    }

    if (auction.seller_id === user.id) {
      console.log('❌ [SERVICE] User trying to bid on own auction')
      throw new Error('Cannot bid on your own auction')
    }

    console.log('✅ [SERVICE] All validations passed, inserting bid...')
    // Insert the bid
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .insert({
        auction_id: auctionId,
        bidder_id: user.id,
        amount
      })
      .select()
      .single()

    console.log('💾 [SERVICE] Bid insert result:', { bid, error: bidError })

    if (bidError) {
      console.log('❌ [SERVICE] Error inserting bid:', bidError)
      throw bidError
    }

    console.log('🔄 [SERVICE] Updating auction current price...')
    // Update auction current price
    const { error: updateError } = await supabase
      .from('auctions')
      .update({ current_price: amount })
      .eq('id', auctionId)

    console.log('📈 [SERVICE] Auction update result, error:', updateError)

    if (updateError) {
      console.log('❌ [SERVICE] Error updating auction price:', updateError)
      throw updateError
    }

    console.log('✅ [SERVICE] Bid placed successfully, returning:', bid)
    return bid
  },

  // Get bids for an auction
  async getBidsForAuction(auctionId: string) {
    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        users!bidder_id (email)
      `)
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false })

    if (error) throw error
    return data
  },

  // Subscribe to real-time updates for an auction
  subscribeToAuction(auctionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`auction-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auctionId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`
        },
        callback
      )
      .subscribe()
  }
}