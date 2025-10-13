import { supabase } from './supabase';

// Configuration flag - set to false until realtime is approved
const REALTIME_ENABLED = false;

// Image Storage Service
export const imageService = {
  async uploadImages(imageObjects, auctionId) {
    const uploadPromises = imageObjects.map(async (imageObj, index) => {
      // Extract the actual File object from the image object
      const file = imageObj.file || imageObj; // Handle both formats
      
      if (!file || !(file instanceof File)) {
        throw new Error(`Invalid file at index ${index}: ${typeof file}`);
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${auctionId}/${Date.now()}-${index}.${fileExt}`;
      
      console.log(`Uploading file ${index + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        fileName: fileName
      });
      
      const { data, error } = await supabase.storage
        .from('auction-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error(`Upload error for file ${index + 1}:`, error);
        throw error;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('auction-images')
        .getPublicUrl(fileName);
      
      console.log(`Successfully uploaded file ${index + 1}:`, publicUrl);
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

// Storage configuration and testing utilities
export const storageUtils = {
  // Test if storage bucket is properly configured
  async testStorageAccess() {
    try {
      // Check if bucket exists and is public
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
        return { success: false, error: bucketsError.message };
      }

      const auctionImagesBucket = buckets.find(b => b.name === 'auction-images');
      
      if (!auctionImagesBucket) {
        console.error('auction-images bucket not found');
        return { success: false, error: 'auction-images bucket not found' };
      }

      console.log('Bucket found:', auctionImagesBucket);
      
      // Test file upload and retrieval
      const testFileName = `test-${Date.now()}.txt`;
      const testContent = new Blob(['test content'], { type: 'text/plain' });
      
      // Upload test file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('auction-images')
        .upload(testFileName, testContent);

      if (uploadError) {
        console.error('Test upload failed:', uploadError);
        return { success: false, error: `Upload failed: ${uploadError.message}` };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('auction-images')
        .getPublicUrl(testFileName);

      console.log('Test file public URL:', publicUrl);

      // Test if URL is accessible
      try {
        const response = await fetch(publicUrl);
        const content = await response.text();
        
        if (content === 'test content') {
          console.log('✅ Storage is working correctly!');
          
          // Clean up test file
          await supabase.storage.from('auction-images').remove([testFileName]);
          
          return { success: true, message: 'Storage is properly configured' };
        } else {
          console.error('❌ Public URL returned unexpected content:', content);
          return { success: false, error: 'Public URL not working properly' };
        }
      } catch (fetchError) {
        console.error('❌ Failed to fetch from public URL:', fetchError);
        return { success: false, error: 'Public URL not accessible' };
      }

    } catch (error) {
      console.error('Storage test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Fix storage policies (run this in Supabase SQL editor if needed)
  getStoragePolicySQL() {
    return `
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('auction-images', 'auction-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove existing policies
DROP POLICY IF EXISTS "Public read access for auction images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Create new policies
CREATE POLICY "Public read access for auction images" ON storage.objects
    FOR SELECT USING (bucket_id = 'auction-images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'auction-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'auction-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'auction-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
`;
  },

  // Clean up invalid image files (JSON metadata files)
  async cleanupInvalidImages() {
    try {
      console.log('Starting cleanup of invalid image files...');
      
      // List all files in the bucket
      const { data: files, error } = await supabase.storage
        .from('auction-images')
        .list('', { limit: 1000 });

      if (error) {
        console.error('Error listing files:', error);
        return { success: false, error: error.message };
      }

      console.log(`Found ${files.length} files in storage`);

      // Filter files that are likely JSON metadata (small size, wrong content-type)
      const suspiciousFiles = [];
      
      for (const file of files) {
        // Check if file is suspiciously small (JSON metadata files are typically < 200 bytes)
        if (file.metadata && file.metadata.size < 1000) {
          suspiciousFiles.push(file.name);
        }
      }

      console.log(`Found ${suspiciousFiles.length} suspicious files:`, suspiciousFiles);

      if (suspiciousFiles.length === 0) {
        return { success: true, message: 'No invalid files found to clean up' };
      }

      // Delete suspicious files
      const { data: deleteResult, error: deleteError } = await supabase.storage
        .from('auction-images')
        .remove(suspiciousFiles);

      if (deleteError) {
        console.error('Error deleting files:', deleteError);
        return { success: false, error: deleteError.message };
      }

      console.log(`Successfully deleted ${suspiciousFiles.length} invalid files`);
      return { 
        success: true, 
        message: `Cleaned up ${suspiciousFiles.length} invalid files`,
        deletedFiles: suspiciousFiles
      };

    } catch (error) {
      console.error('Cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }
};

// Real-time Services (disabled for now, easy to enable later)
export const realtimeService = {
  // Subscribe to auction updates
  subscribeToAuction(auctionId, callback) {
    if (!REALTIME_ENABLED) {
      console.log('Realtime disabled - would subscribe to auction:', auctionId);
      // Return a no-op unsubscribe function
      return () => {};
    }
    
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
    if (!REALTIME_ENABLED) {
      console.log('Realtime disabled - would subscribe to notifications for user:', userId);
      return () => {};
    }
    
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

  // Send notification (works without realtime)
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
  },

  // Polling alternative for auction updates (when realtime is disabled)
  async pollAuctionUpdates(auctionId, lastCheckTime = null) {
    if (REALTIME_ENABLED) return null; // Use realtime instead
    
    let query = supabase
      .from('bids')
      .select(`
        *, 
        users!bidder_id(
          user_profiles(username)
        )
      `)
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false });
    
    if (lastCheckTime) {
      query = query.gt('created_at', lastCheckTime);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data;
  }
};

// Auction Services
export const auctionService = {
  // Get all auctions with filters
  async getAuctions(filters = {}) {
    let query = supabase
      .from('auctions')
      .select(`
        *,
        users!seller_id(
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
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    
    if (filters.priceRange && filters.priceRange !== 'all') {
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
    return data.map(auction => {
      // Handle image URL properly - check if we have image_urls first, then fallback to image_url
      let primaryImage = auction.image_url;
      
      if (auction.image_urls) {
        try {
          const imageUrls = typeof auction.image_urls === 'string' 
            ? JSON.parse(auction.image_urls) 
            : auction.image_urls;
          
          if (Array.isArray(imageUrls) && imageUrls.length > 0) {
            primaryImage = imageUrls[0];
          }
        } catch (parseError) {
          console.error('Error parsing image_urls in getAuctions:', parseError);
          // Keep using auction.image_url as fallback
        }
      }
      
      return {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        currentBid: auction.bids?.length > 0 
          ? Math.max(...auction.bids.map(b => b.amount))
          : auction.reserve || auction.starting_bid || 0,
        reservePrice: auction.reserve || 0,
        timeRemaining: calculateTimeRemaining(auction.end_at),
        image: primaryImage || "https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=300&fit=crop",
        seller: {
          name: auction.users?.user_profiles?.username || 'Unknown',
          rating: auction.users?.user_profiles?.rating_average || 0,
          verified: true // You can add this logic based on your needs
        },
        totalBids: auction.bids?.length || 0,
        category: auction.category || 'General',
        views: auction.views || 0,
        shippingIncluded: auction.shipping_included || false,
        featured: auction.featured || false
      };
    });
  },

  // Get single auction by ID with polling support
  async getAuctionById(id, includeBids = true) {
    let query = supabase
      .from('auctions')
      .select(`
        *,
        users!seller_id(
          id,
          email,
          user_profiles(*)
        ),
        ${includeBids ? `bids(
          *,
          users!bidder_id(
            user_profiles(username, profile_image)
          )
        ),` : ''}
        outcomes(*)
      `)
      .eq('id', id)
      .single();

    const { data, error } = await query;

    if (error) throw error;
    
    // Parse image URLs properly
    let images = [];
    if (data.image_urls) {
      try {
        // If image_urls is a string, parse it as JSON
        images = typeof data.image_urls === 'string' 
          ? JSON.parse(data.image_urls) 
          : data.image_urls;
      } catch (parseError) {
        console.error('Error parsing image_urls:', parseError);
        // Fallback to treating as array or single image
        images = Array.isArray(data.image_urls) ? data.image_urls : [data.image_urls];
      }
    }
    
    // Fallback to single image_url if no image_urls array
    if (!images || images.length === 0) {
      if (data.image_url) {
        images = [data.image_url];
      } else {
        images = ["https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=300&fit=crop"];
      }
    }

    // Ensure all image URLs are valid
    const validImages = images.filter(url => url && typeof url === 'string' && url.trim() !== '');
    
    if (validImages.length === 0) {
      validImages.push("https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=300&fit=crop");
    }
    
    const auction = {
      id: data.id,
      title: data.title,
      description: data.description,
      currentBid: data.bids?.length > 0 
        ? Math.max(...data.bids.map(b => b.amount))
        : data.reserve || data.starting_bid || 0,
      reservePrice: data.reserve || 0,
      reserveMet: data.bids?.some(b => b.amount >= (data.reserve || 0)) || false,
      startTime: data.start_at,
      endTime: data.end_at,
      seller: {
        id: data.seller_id,
        username: data.users?.user_profiles?.username,
        profileImage: data.users?.user_profiles?.profile_image,
        rating: data.users?.user_profiles?.rating_average || 0,
        verified: true
      },
      bids: includeBids ? (data.bids?.map(bid => ({
        id: bid.id,
        amount: bid.amount,
        timestamp: bid.created_at,
        bidder: bid.users?.user_profiles?.username || 'Anonymous'
      })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) || []) : [],
      images: validImages,
      category: data.category || 'General',
      condition: data.condition || 'New',
      location: data.location || 'Singapore',
      shippingOptions: data.shipping_options || ['Standard Delivery'],
      returnPolicy: data.return_policy || '7 days return policy'
    };

    return auction;
  },

  // Create new auction
  async createAuction(auctionData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Ensure user exists in our users table (create if doesn't exist)
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, other errors are real problems
      throw userCheckError;
    }

    // If user doesn't exist in our users table, create them
    if (!existingUser) {
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (createUserError) {
        throw new Error(`Failed to create user record: ${createUserError.message}`);
      }

      // Also ensure user profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (!existingProfile) {
        // Create a basic profile if it doesn't exist
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Failed to create user profile:', profileError);
          // Don't fail auction creation if profile creation fails
        }
      }
    }

    // Calculate end time more precisely
    const startDateTime = new Date(`${auctionData.startDate}T${auctionData.startTime}`);
    const durationInDays = parseFloat(auctionData.duration);
    
    // Convert days to milliseconds with better precision
    const durationInMs = Math.round(durationInDays * 24 * 60 * 60 * 1000);
    const endDateTime = new Date(startDateTime.getTime() + durationInMs);
    
    // Ensure end time is after start time
    if (endDateTime <= startDateTime) {
      throw new Error('Auction end time must be after start time');
    }
    
    console.log('Auction timing calculation:', {
      startDate: auctionData.startDate,
      startTime: auctionData.startTime,
      duration: auctionData.duration,
      durationInDays,
      durationInMs,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      timeDiff: endDateTime.getTime() - startDateTime.getTime()
    });

    // Now create the auction
    const { data: auction, error } = await supabase
      .from('auctions')
      .insert({
        seller_id: user.id,
        title: auctionData.title,
        description: auctionData.description,
        reserve: parseFloat(auctionData.reservePrice) || 0,
        starting_bid: parseFloat(auctionData.reservePrice) || 0,
        start_at: startDateTime.toISOString(),
        end_at: endDateTime.toISOString(),
        category: auctionData.category,
        condition: auctionData.condition,
        shipping_method: auctionData.shippingMethod,
        shipping_cost: auctionData.shippingCost ? parseFloat(auctionData.shippingCost) : null,
        location: auctionData.itemLocation || 'Singapore',
        return_policy: auctionData.returnPolicy,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Database insertion error:', error);
      throw error;
    }

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

  // Place bid with pre-authorization integration
  async placeBid(auctionId, amount) {
    console.log('🚀 PLACE BID FUNCTION CALLED - IMMEDIATE LOG');
    console.log('📊 Arguments received:', { auctionId, amount, type: typeof amount });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated');
    }

    console.log('✅ User authenticated:', { 
      id: user.id, 
      email: user.email
    });

    // NEW FLOW: This function is now just a wrapper for the new API endpoints
    // The actual bidding logic is handled by:
    // 1. /api/bids/pre-authorize - for payment pre-authorization
    // 2. /api/bids/place - for actual bid placement
    
    // For backward compatibility, we'll call the new API endpoints
    try {
      // First check if user has an active pre-authorization for this auction
      const { data: existingPreAuth } = await supabase
        .from('bid_pre_authorizations')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('bidder_id', user.id)
        .eq('status', 'active')
        .single();

      if (!existingPreAuth) {
        throw new Error('No active pre-authorization found. Please pre-authorize your payment method first.');
      }

      // Call the new bid placement API
      const response = await fetch('/api/bids/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId,
          bidAmount: amount,
          preAuthId: existingPreAuth.id,
          bidderId: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to place bid');
      }

      console.log('✅ Bid placed successfully via new API:', result);
      return result.bid;

    } catch (error) {
      console.error('❌ Bid placement failed:', error);
      throw error;
    }
  },

  // New method: Check bid pre-authorization status
  async checkBidPreAuth(auctionId, bidderId) {
    const { data: preAuth, error } = await supabase
      .from('bid_pre_authorizations')
      .select('*')
      .eq('auction_id', auctionId)
      .eq('bidder_id', bidderId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return preAuth;
  },

  // New method: Complete auction and process payments
  async completeAuction(auctionId) {
    try {
      const response = await fetch('/api/auctions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete auction');
      }

      console.log('✅ Auction completed successfully:', result);
      return result;

    } catch (error) {
      console.error('❌ Auction completion failed:', error);
      throw error;
    }
  },

  // New method: Get auction winner details
  async getAuctionWinner(auctionId) {
    const { data: winner, error } = await supabase
      .from('auction_winners')
      .select(`
        *,
        users!winner_id(
          user_profiles(username, profile_image)
        ),
        bids!winning_bid_id(amount, created_at)
      `)
      .eq('auction_id', auctionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return winner;
  },

  // New method: Get payment status for an auction
  async getAuctionPaymentStatus(auctionId) {
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        payouts(*),
        escrow_holds(*)
      `)
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return payment;
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

  // Create user profile (needed for new users)
  async createUserProfile(userId, profileData) {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        username: profileData.username,
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        ...profileData
      })
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

// Payment Services (Enhanced for Stripe PaymentIntent + Connect Flow)
export const paymentService = {
  // Step 1: Create payment intent for auction winner
  async createPaymentIntent(auctionId, amount, paymentMethodId, buyerId) {
    const response = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        auctionId, 
        amount, 
        paymentMethodId, 
        buyerId 
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create payment intent');
    }
    
    return response.json();
  },

  // Step 2: Capture payment after auction ends
  async capturePayment(auctionId, paymentIntentId) {
    const response = await fetch('/api/payments/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auctionId, paymentIntentId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to capture payment');
    }
    
    return response.json();
  },

  // Step 3: Release payment to seller (manual or auto after 5 days)
  async releasePayment(payoutId, auctionId, reason = 'buyer_confirmation') {
    const response = await fetch('/api/payments/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payoutId, auctionId, reason })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to release payment');
    }
    
    return response.json();
  },

  // Step 4: Process refund for disputes
  async processRefund(paymentIntentId, auctionId, reason, amount = null) {
    const response = await fetch('/api/payments/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId, auctionId, reason, amount })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process refund');
    }
    
    return response.json();
  },

  // Seller onboarding - Create Stripe Connect account
  async createStripeAccount(userId, email, type = 'express') {
    const response = await fetch('/api/stripe/create-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, type })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create Stripe account');
    }
    
    return response.json();
  },

  // Get payment status and details
  async getPaymentStatus(auctionId) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        payouts(*),
        outcomes(*)
      `)
      .eq('auction_id', auctionId)
      .single();

    if (error) throw error;
    return data;
  },

  // Get all payouts for a seller
  async getSellerPayouts(sellerId, status = null) {
    let query = supabase
      .from('payouts')
      .select(`
        *,
        auctions(title, id),
        payments(amount, status)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get payment history for a buyer
  async getBuyerPayments(buyerId) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        auctions(title, id, seller_id),
        outcomes(*)
      `)
      .eq('user_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Check if seller has completed Stripe onboarding
  async checkSellerOnboardingStatus(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return {
      hasStripeAccount: !!data.stripe_account_id,
      onboardingComplete: !!data.stripe_onboarding_complete,
      accountId: data.stripe_account_id
    };
  },

  // Record payment in database (for legacy compatibility)
  async recordPayment(paymentIntentId, userId, amount, auctionId) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        intent_id: paymentIntentId,
        stripe_payment_intent_id: paymentIntentId,
        amount,
        auction_id: auctionId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Dispute handling
  async openDispute(paymentId, auctionId, reason, description) {
    const { data, error } = await supabase
      .from('disputes')
      .insert({
        payment_id: paymentId,
        auction_id: auctionId,
        opener_id: (await supabase.auth.getUser()).data.user?.id,
        reason,
        category: 'payment_issue',
        status: 'open'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Utility to enable realtime when approved
export const enableRealtime = () => {
  console.log('Realtime features enabled! Remember to update REALTIME_ENABLED to true');
  // When realtime is approved, just change REALTIME_ENABLED to true
  // and all the subscription functions will start working
};

export default auctionService;