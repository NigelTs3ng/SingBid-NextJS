import { supabase } from '../utils/supabaseClient'
import { Database } from '../types/supabase'

type Auction = Database['public']['Tables']['auctions']['Row']
type AuctionInsert = Database['public']['Tables']['auctions']['Insert']
type Bid = Database['public']['Tables']['bids']['Row']
type BidInsert = Database['public']['Tables']['bids']['Insert']

export const auctionService = {
  // Get all active auctions with filters
  async getAuctions(filters = {}) {
    let query = supabase
      .from('auctions')
      .select(`
        *,
        users!seller_id (
          id,
          email,
          user_profiles(username, profile_image, rating_average, rating_count)
        ),
        bids(
          amount, 
          created_at, 
          users!bidder_id(
            user_profiles(username)
          )
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }
    
    if (filters.priceRange && filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.split('-').map(Number)
      if (max) {
        query = query.gte('reserve', min).lte('reserve', max)
      } else {
        query = query.gte('reserve', min)
      }
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    
    if (error) throw error
    
    // Transform data to match expected format
    return data.map(auction => {
      // Calculate time remaining
      const calculateTimeRemaining = (endTime: string) => {
        const now = new Date()
        const end = new Date(endTime)
        const diff = end.getTime() - now.getTime()

        if (diff <= 0) {
          return { hours: 0, minutes: 0, seconds: 0 }
        }

        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        return { hours, minutes, seconds }
      }

      // Handle image URL properly
      let primaryImage = auction.image_url
      
      if (auction.image_urls) {
        try {
          const imageUrls = typeof auction.image_urls === 'string' 
            ? JSON.parse(auction.image_urls) 
            : auction.image_urls
          
          if (Array.isArray(imageUrls) && imageUrls.length > 0) {
            primaryImage = imageUrls[0]
          }
        } catch (parseError) {
          console.error('Error parsing image_urls:', parseError)
        }
      }
      
      return {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        currentBid: auction.bids?.length > 0 
          ? Math.max(...auction.bids.map((b: any) => b.amount))
          : auction.reserve || auction.starting_bid || 0,
        reservePrice: auction.reserve || 0,
        timeRemaining: calculateTimeRemaining(auction.end_at),
        image: primaryImage || "https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=300&fit=crop",
        seller: {
          name: auction.users?.user_profiles?.username || 'Unknown',
          rating: auction.users?.user_profiles?.rating_average || 0,
          verified: true
        },
        totalBids: auction.bids?.length || 0,
        category: auction.category || 'General',
        views: auction.views || 0,
        shippingIncluded: auction.shipping_included || false,
        featured: auction.featured || false
      }
    })
  },

  // Create a new auction
  async createAuction(auctionData: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Map form data to database columns
    const mappedData = {
      seller_id: user.id,
      title: auctionData.title,
      description: auctionData.description,
      reserve: parseFloat(auctionData.reservePrice) || 0,
      starting_bid: parseFloat(auctionData.reservePrice) || 0,
      category: auctionData.category,
      condition: auctionData.condition,
      shipping_method: auctionData.shippingMethod,
      shipping_cost: auctionData.shippingCost ? parseFloat(auctionData.shippingCost) : null,
      location: auctionData.itemLocation || 'Singapore',
      return_policy: auctionData.returnPolicy,
      return_conditions: auctionData.returnConditions,
      require_verified_phone: auctionData.requireVerifiedPhone || false,
      require_min_rating: auctionData.requireMinRating || false,
      min_rating: auctionData.minRating ? parseFloat(auctionData.minRating) : 0,
      block_unpaid_buyers: auctionData.blockUnpaidBuyers || false,
      additional_requirements: auctionData.additionalRequirements || null,
      status: 'active'
    }

    const { data, error } = await supabase
      .from('auctions')
      .insert(mappedData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get all active auctions (legacy method for backward compatibility)
  async getActiveAuctions() {
    return this.getAuctions()
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
      .select('id, status, end_at, seller_id, reserve, starting_bid')
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
    // Get current highest bid to check against
    const { data: currentBids } = await supabase
      .from('bids')
      .select('amount')
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false })
      .limit(1)
    
    const currentHighestBid = currentBids?.[0]?.amount || auction.reserve || auction.starting_bid || 0
    console.log('💰 [SERVICE] Price check - current highest bid:', currentHighestBid, 'bid:', amount)
    console.log('👥 [SERVICE] Owner check - seller_id:', auction.seller_id, 'bidder_id:', user.id)

    if (auction.status !== 'active') {
      console.log('❌ [SERVICE] Auction is not active, status:', auction.status)
      throw new Error('Auction is not active')
    }
    
    if (new Date(auction.end_time) < new Date()) {
      console.log('❌ [SERVICE] Auction has ended')
      throw new Error('Auction has ended')
    }
    
    if (amount <= currentHighestBid) {
      console.log('❌ [SERVICE] Bid amount too low')
      throw new Error(`Bid must be higher than current bid of ${currentHighestBid}`)
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
    // Note: We don't need to update current_price as it doesn't exist in the schema
    // The current bid is calculated from the bids table

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