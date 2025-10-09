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

    // Now create the auction
    const { data: auction, error } = await supabase
      .from('auctions')
      .insert({
        seller_id: user.id,
        title: auctionData.title,
        description: auctionData.description,
        reserve: parseFloat(auctionData.reservePrice) || 0,
        starting_bid: parseFloat(auctionData.reservePrice) || 0,
        start_at: new Date(`${auctionData.startDate}T${auctionData.startTime}`),
        end_at: new Date(new Date(`${auctionData.startDate}T${auctionData.startTime}`).getTime() + 
                parseInt(auctionData.duration) * 24 * 60 * 60 * 1000),
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

  // Place bid with polling fallback
  async placeBid(auctionId, amount) {
    console.log('🚀 PLACE BID FUNCTION CALLED - IMMEDIATE LOG');
    console.log('📊 Arguments received:', { auctionId, amount, type: typeof amount });
    console.log('🌐 Current URL:', window.location.href);
    console.log('🔍 Starting placeBid function...', { auctionId, amount });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated');
    }

    console.log('✅ User authenticated:', { 
      id: user.id, 
      email: user.email,
      role: user.role,
      aud: user.aud 
    });

    // Check if user exists in our users table
    console.log('🔍 Checking if user exists in users table...');
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('id', user.id)
      .single();

    if (userCheckError) {
      console.log('⚠️ User check error:', userCheckError);
      if (userCheckError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, other errors are real problems
        console.error('❌ Unexpected user check error:', userCheckError);
        throw userCheckError;
      }
      console.log('📝 User not found in users table (PGRST116)');
    } else {
      console.log('✅ User found in users table:', existingUser);
    }

    // If user doesn't exist in our users table, create them
    if (!existingUser) {
      console.log('🔄 Creating user record for bid placement...');
      const { data: createdUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createUserError) {
        console.error('❌ Failed to create user record:', createUserError);
        throw new Error(`Failed to create user record: ${createUserError.message}`);
      }

      console.log('✅ User record created:', createdUser);

      // Also ensure user profile exists
      console.log('🔍 Checking if user profile exists...');
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .eq('user_id', user.id)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('❌ Profile check error:', profileCheckError);
      } else if (!existingProfile) {
        console.log('🔄 Creating user profile...');
        // Create a basic profile if it doesn't exist
        const { data: createdProfile, error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (profileError) {
          console.error('⚠️ Failed to create user profile:', profileError);
          // Don't fail bid placement if profile creation fails
        } else {
          console.log('✅ User profile created:', createdProfile);
        }
      } else {
        console.log('✅ User profile exists:', existingProfile);
      }
    }

    // Verify auction exists and get auction details
    console.log('🔍 Verifying auction exists...');
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id, title, seller_id, status, end_at, reserve')
      .eq('id', auctionId)
      .single();

    if (auctionError) {
      console.error('❌ Auction verification failed:', auctionError);
      throw new Error(`Auction not found: ${auctionError.message}`);
    }

    console.log('✅ Auction found:', auction);

    // Check if user is trying to bid on their own auction
    if (auction.seller_id === user.id) {
      console.error('❌ User trying to bid on their own auction');
      throw new Error('Cannot bid on your own auction');
    }

    // Check auction status
    if (auction.status !== 'active') {
      console.error('❌ Auction is not active:', auction.status);
      throw new Error('Auction is not active');
    }

    // Check if auction has ended
    const now = new Date();
    const endTime = new Date(auction.end_at);
    if (endTime <= now) {
      console.error('❌ Auction has ended');
      throw new Error('Auction has ended');
    }

    // Get current highest bid to validate bid amount
    console.log('🔍 Getting current highest bid...');
    const { data: currentBids, error: bidsError } = await supabase
      .from('bids')
      .select('amount')
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false })
      .limit(1);

    if (bidsError) {
      console.error('⚠️ Error fetching current bids:', bidsError);
    } else {
      console.log('📊 Current bids:', currentBids);
    }

    const currentHighestBid = currentBids && currentBids.length > 0 ? currentBids[0].amount : auction.reserve || 0;
    const bidAmount = parseFloat(amount);

    console.log('💰 Bid validation:', { 
      bidAmount, 
      currentHighestBid, 
      reserve: auction.reserve,
      isValid: bidAmount > currentHighestBid 
    });

    if (bidAmount <= currentHighestBid) {
      throw new Error(`Bid must be higher than current bid of $${currentHighestBid}`);
    }

    // Test RLS permissions by doing a simple select first
    console.log('🔍 Testing RLS permissions...');
    const { data: testData, error: testError } = await supabase
      .from('bids')
      .select('id')
      .eq('auction_id', auctionId)
      .limit(1);

    if (testError) {
      console.error('❌ RLS test failed:', testError);
    } else {
      console.log('✅ RLS test passed, can read bids:', testData?.length || 0);
    }

    // Now attempt to place the bid
    console.log('🎯 Attempting to place bid...');
    const bidData = {
      auction_id: auctionId,
      bidder_id: user.id,
      amount: bidAmount
    };
    
    console.log('💾 Bid data to insert:', bidData);

    const { data: placedBid, error } = await supabase
      .from('bids')
      .insert(bidData)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Bid placement failed:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Additional debugging for 403 errors
      if (error.code === '42501' || error.message?.includes('403') || error.message?.includes('permission')) {
        console.error('🔒 Permission denied details:', {
          userRole: user.role,
          userAud: user.aud,
          userId: user.id,
          auctionId,
          errorCode: error.code,
          errorMessage: error.message
        });
        
        // Check if user can insert into any other table to test general permissions
        try {
          console.log('🧪 Testing general insert permissions...');
          const { data: testInsert, error: testInsertError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('user_id', user.id)
            .limit(1);
          
          console.log('🔍 General permission test result:', { testInsert, testInsertError });
        } catch (permTest) {
          console.error('❌ General permission test failed:', permTest);
        }
      }
      
      throw error;
    }

    console.log('🎉 Bid placed successfully:', placedBid);

    // If realtime is disabled, we can still return the bid
    // The UI will need to refresh/poll to see updates
    return placedBid;
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

// Utility to enable realtime when approved
export const enableRealtime = () => {
  console.log('Realtime features enabled! Remember to update REALTIME_ENABLED to true');
  // When realtime is approved, just change REALTIME_ENABLED to true
  // and all the subscription functions will start working
};

export default auctionService;