import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabase } from '../../../lib/supabase'
import ImageService, { AuctionImage } from '../../../lib/imageService'

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/auctions called');
    
    // Create admin client for operations that bypass RLS
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // This bypasses RLS
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Get authenticated user
    const cookieStore = await cookies()
    console.log('Cookies available:', cookieStore.getAll().map(c => c.name));
    
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    console.log('User from auth:', user?.id, 'Error:', authError);
    
    if (authError || !user) {
      console.log('Authentication failed:', { authError, hasUser: !!user });
      return NextResponse.json(
        { error: 'Authentication required', debug: { authError: authError?.message, hasUser: !!user } },
        { status: 401 }
      )
    }
    
    console.log('User authenticated:', user.id);
    
    // Verify user is a seller - use admin client to avoid RLS issues
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('user_role')
      .eq('id', user.id)
      .single()
    
    console.log('User profile:', userProfile, 'Profile error:', profileError);
    
    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // User doesn't exist in users table - create them
        console.log('Creating missing user profile...');
        
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            user_role: 'seller' // Default to seller for create auction
          })
          .select()
          .single();
        
        if (createError) {
          console.log('Failed to create user:', createError);
          return NextResponse.json(
            { error: 'Failed to create user profile', details: createError.message },
            { status: 500 }
          )
        }
        
        console.log('User created successfully:', newUser);
      } else {
        // Some other error occurred
        console.log('Unexpected profile fetch error:', profileError);
        return NextResponse.json(
          { error: 'Failed to fetch user profile', details: profileError.message },
          { status: 500 }
        )
      }
    } else if (userProfile?.user_role !== 'seller') {
      return NextResponse.json(
        { error: 'Seller account required', userRole: userProfile?.user_role },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { 
      title, 
      description, 
      starting_price, 
      end_time,
      category,
      condition,
      location,
      images = [] 
    } = body

    // Validate required fields
    if (!title || !description || !starting_price || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate price
    const price = parseFloat(starting_price)
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: 'Starting price must be a positive number' },
        { status: 400 }
      )
    }

    // Validate end time
    const endDate = new Date(end_time)
    if (endDate <= new Date()) {
      return NextResponse.json(
        { error: 'End time must be in the future' },
        { status: 400 }
      )
    }

    // Create auction using service role to bypass RLS
    const { data: auctionData, error: auctionError } = await supabaseAdmin
      .from('auctions')
      .insert({
        title,
        description,
        starting_price: price,
        current_price: price,
        seller_id: user.id,
        end_time,
        status: 'active'
      })
      .select()
      .single()

    if (auctionError) {
      console.error('Auction creation error:', auctionError)
      return NextResponse.json(
        { error: 'Failed to create auction' },
        { status: 500 }
      )
    }

    // Save images if provided - use admin client to bypass RLS
    let savedImages: AuctionImage[] = []
    if (images.length > 0) {
      try {
        console.log('Processing images:', images);
        
        const imagePromises = images.map(async (image: any, index: number) => {
          // Image data should contain the file path from storage
          const imageData = {
            auction_id: auctionData.id,
            image_url: image.url || image.image_url, // The full public URL
            image_path: image.image_path || image.path, // The storage path
            display_order: index,
            is_primary: index === 0, // First image is primary
            file_size: image.file_size,
            mime_type: image.mime_type,
            width: image.width,
            height: image.height,
            alt_text: image.alt_text || image.name
          }
          
          console.log('Saving image metadata:', imageData);
          
          // Use admin client to save image metadata
          const { data, error } = await supabaseAdmin
            .from('auction_images')
            .insert(imageData)
            .select()
            .single();
          
          if (error) {
            console.error('Database save error:', error);
            return null;
          }
          
          console.log('Image saved successfully:', data);
          return data;
        })

        const results = await Promise.all(imagePromises)
        savedImages = results.filter(Boolean) as AuctionImage[]
        console.log('Saved images:', savedImages);
      } catch (error) {
        console.error('Error saving images:', error)
        // Continue even if images fail to save
      }
    }

    return NextResponse.json({
      success: true,
      auction: auctionData,
      images: savedImages
    })
  } catch (error) {
    console.error('Auction creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const status = searchParams.get('status') || 'active'
    const sellerId = searchParams.get('seller_id')
    
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('auctions')
      .select(`
        *,
        auction_images(*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by seller if provided
    if (sellerId) {
      query = query.eq('seller_id', sellerId)
    }

    const { data: auctions, error } = await query

    if (error) {
      console.error('Error fetching auctions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch auctions' },
        { status: 500 }
      )
    }

    // Format response with primary images and Supabase storage URLs
    const formattedAuctions = auctions?.map(auction => {
      const primaryImage = auction.auction_images?.find((img: AuctionImage) => img.is_primary);
      let primaryImageUrl = null;
      
      if (primaryImage?.image_url) {
        // Check if image_url is already a full URL or just a path
        if (primaryImage.image_url.startsWith('http')) {
          primaryImageUrl = primaryImage.image_url; // Already a full URL
        } else {
          primaryImageUrl = supabase.storage.from('auction-images').getPublicUrl(primaryImage.image_url).data.publicUrl;
        }
      }
      
      return {
        ...auction,
        primary_image: primaryImageUrl,
        image_count: auction.auction_images?.length || 0,
        images: auction.auction_images?.map(img => ({
          ...img,
          url: img.image_url?.startsWith('http') 
            ? img.image_url 
            : img.image_url ? supabase.storage.from('auction-images').getPublicUrl(img.image_url).data.publicUrl : null
        })) || []
      };
    }) || []

    return NextResponse.json({
      auctions: formattedAuctions,
      page,
      limit,
      total: formattedAuctions.length
    })
  } catch (error) {
    console.error('Error fetching auctions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}