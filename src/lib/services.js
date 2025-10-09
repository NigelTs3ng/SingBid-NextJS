import { supabase } from './supabase';

// Image Storage Service
export const imageService = {
  async uploadImages(files, auctionId) {
    const uploadPromises = files.map(async (file, index) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${auctionId}/${Date.now()}-${index}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('auction-images')
        .upload(fileName, file);
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('auction-images')
        .getPublicUrl(fileName);
      
      return publicUrl;
    });
    
    return Promise.all(uploadPromises);
  },

  async deleteImages(imageUrls) {
    const deletePromises = imageUrls.map(url => {
      const fileName = url.split('/').slice(-2).join('/'); // Extract path from URL
      return supabase.storage
        .from('auction-images')
        .remove([fileName]);
    });
    
    return Promise.all(deletePromises);
  }
};

// Real-time Services
export const realtimeService = {
  // Subscribe to auction updates
  subscribeToAuction(auctionId, callback) {
    const subscription = supabase
      .channel(`auction-${auctionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bids',
        filter: `auction_id=eq.${auctionId}`
      }, callback)
      .subscribe();

    return () => supabase.removeChannel(subscription);
  },

  // Subscribe to user notifications
  subscribeToNotifications(userId, callback) {
    const subscription = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe();

    return () => supabase.removeChannel(subscription);
  },

  // Send notification
  async sendNotification(userId, type, message, link = null) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        message,
        link,
        read: false
      });

    if (error) throw error;
    return data;
  }
};

// Auction Services
const updatedAuctionService = {
  ...auctionService,
  
  // Get all auctions with filters
  async getAuctions(filters = {}) {
    let query = supabase
      .from('auctions')
      .select(`
        *,
        user_profiles!seller_id(username, profile_image, rating_average, rating_count),
        bids(amount, created_at, user_profiles(username))
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.category) {
      // You might need to add a category column to auctions table
      query = query.eq('category', filters.category);
    }
    
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      if (max) {
        query = query.gte('reserve', min).lte('reserve', max);
      } else {
        query = query.gte('reserve', min);
      }
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform data to match current format
    return data.map(auction => ({
      id: auction.id,
      title: auction.title,
      description: auction.description,
      currentBid: auction.bids?.length > 0 
        ? Math.max(...auction.bids.map(b => b.amount))
        : auction.reserve,
      reservePrice: auction.reserve,
      timeRemaining: calculateTimeRemaining(auction.end_at),
      image: auction.image_url || "https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=300&fit=crop",
      seller: {
        name: auction.user_profiles?.username || 'Unknown',
        rating: auction.user_profiles?.rating_average || 0,
        verified: true // You can add this logic based on your needs
      },
      totalBids: auction.bids?.length || 0,
      category: auction.category || 'General',
      views: auction.views || 0,
      shippingIncluded: auction.shipping_included || false,
      featured: auction.featured || false
    }));
  },

  // Get single auction by ID
  async getAuctionById(id) {
    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        user_profiles!seller_id(*),
        bids(*,user_profiles(username, profile_image)),
        outcomes(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      currentBid: data.bids?.length > 0 
        ? Math.max(...data.bids.map(b => b.amount))
        : data.reserve,
      reservePrice: data.reserve,
      reserveMet: data.bids?.some(b => b.amount >= data.reserve) || false,
      startTime: data.start_at,
      endTime: data.end_at,
      seller: {
        id: data.seller_id,
        username: data.user_profiles?.username,
        profileImage: data.user_profiles?.profile_image,
        rating: data.user_profiles?.rating_average || 0,
        verified: true
      },
      bids: data.bids?.map(bid => ({
        id: bid.id,
        amount: bid.amount,
        timestamp: bid.created_at,
        bidder: bid.user_profiles?.username || 'Anonymous'
      })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      images: [data.image_url || "https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=300&fit=crop"],
      category: data.category || 'General',
      condition: data.condition || 'New',
      location: data.location || 'Singapore',
      shippingOptions: data.shipping_options || ['Standard Delivery'],
      returnPolicy: data.return_policy || '7 days return policy'
    };
  },

  // Create new auction
  async createAuction(auctionData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First create the auction
    const { data: auction, error } = await supabase
      .from('auctions')
      .insert({
        seller_id: user.id,
        title: auctionData.title,
        description: auctionData.description,
        reserve: parseFloat(auctionData.reservePrice),
        start_at: new Date(`${auctionData.startDate}T${auctionData.startTime}`),
        end_at: new Date(new Date(`${auctionData.startDate}T${auctionData.startTime}`).getTime() + 
                parseInt(auctionData.duration) * 24 * 60 * 60 * 1000),
        category: auctionData.category,
        condition: auctionData.condition,
        shipping_method: auctionData.shippingMethod,
        shipping_cost: auctionData.shippingCost ? parseFloat(auctionData.shippingCost) : null,
        location: auctionData.itemLocation,
        return_policy: auctionData.returnPolicy,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    // Upload images if provided
    if (auctionData.images && auctionData.images.length > 0) {
      try {
        const imageUrls = await imageService.uploadImages(auctionData.images, auction.id);
        
        // Update auction with primary image URL
        const { error: updateError } = await supabase
          .from('auctions')
          .update({ 
            image_url: imageUrls[0],
            image_urls: imageUrls // Store all image URLs as JSON array
          })
          .eq('id', auction.id);
          
        if (updateError) throw updateError;
        
        auction.image_url = imageUrls[0];
        auction.image_urls = imageUrls;
      } catch (imageError) {
        console.error('Image upload failed:', imageError);
        // Don't fail auction creation if image upload fails
      }
    }

    return auction;
  },

  // Place bid
  async placeBid(auctionId, amount) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('bids')
      .insert({
        auction_id: auctionId,
        bidder_id: user.id,
        amount: parseFloat(amount)
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Utility function to calculate time remaining
function calculateTimeRemaining(endTime) {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end - now;

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
}

// User Services
export const userService = {
  // Get user profile
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Follow/unfollow user
  async toggleFollow(followerId, followedUserId) {
    // Check if already following
    const { data: existing } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', followerId)
      .eq('followed_user_id', followedUserId)
      .single();

    if (existing) {
      // Unfollow
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', followerId)
        .eq('followed_user_id', followedUserId);

      if (error) throw error;
      return { isFollowing: false };
    } else {
      // Follow
      const { data, error } = await supabase
        .from('followers')
        .insert({
          follower_id: followerId,
          followed_user_id: followedUserId
        });

      if (error) throw error;
      return { isFollowing: true };
    }
  }
};

// Payment Services (for integration with Stripe)
export const paymentService = {
  // Create payment intent
  async createPaymentIntent(auctionId, amount) {
    // This would typically call your backend API endpoint that creates Stripe payment intent
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auctionId, amount })
    });

    if (!response.ok) throw new Error('Failed to create payment intent');
    return response.json();
  },

  // Record payment in database
  async recordPayment(paymentIntentId, userId, amount, auctionId) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        intent_id: paymentIntentId,
        amount,
        status: 'pending'
      });

    if (error) throw error;
    return data;
  }
};

export { updatedAuctionService as auctionService };
export default auctionService;