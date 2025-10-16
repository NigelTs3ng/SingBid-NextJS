import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import ImageService, { AuctionImage } from '@/lib/imageService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      title, 
      description, 
      starting_price, 
      end_time, 
      seller_id, 
      images = [] 
    } = body

    // Validate required fields
    if (!title || !description || !starting_price || !end_time || !seller_id) {
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

    // Create auction
    const { data: auctionData, error: auctionError } = await supabase
      .from('auctions')
      .insert({
        title,
        description,
        starting_price: price,
        current_price: price,
        seller_id,
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

    // Save images if provided
    let savedImages: AuctionImage[] = []
    if (images.length > 0) {
      try {
        const imagePromises = images.map(async (image: AuctionImage, index: number) => {
          const imageData = {
            ...image,
            auction_id: auctionData.id,
            display_order: index,
            is_primary: index === 0 // First image is primary
          }
          
          const result = await ImageService.saveImageMetadata(imageData)
          return result.success ? result.image : null
        })

        const results = await Promise.all(imagePromises)
        savedImages = results.filter(Boolean) as AuctionImage[]
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
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

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

    // Format response with primary images
    const formattedAuctions = auctions?.map(auction => ({
      ...auction,
      primary_image: auction.auction_images?.find((img: AuctionImage) => img.is_primary)?.image_url,
      image_count: auction.auction_images?.length || 0,
      images: auction.auction_images || []
    })) || []

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