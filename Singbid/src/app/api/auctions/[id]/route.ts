import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params
    
    if (!auctionId) {
      return NextResponse.json(
        { error: 'Auction ID is required' },
        { status: 400 }
      )
    }
    
    // Get auction with related data
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select(`
        *,
        auction_images(*),
        users!seller_id(
          id,
          name,
          email,
          created_at
        )
      `)
      .eq('id', auctionId)
      .single()
    
    if (auctionError) {
      console.error('Error fetching auction:', auctionError)
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }
    
    // Get bid count and highest bidder info
    const { data: bidStats } = await supabase
      .from('bids')
      .select('id, amount, bidder_id, users!bidder_id(name)')
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false })
      .limit(1)
    
    const { count: bidCount } = await supabase
      .from('bids')
      .select('id', { count: 'exact' })
      .eq('auction_id', auctionId)
    
    // Format response with Supabase storage URLs
    const primaryImage = auction.auction_images?.find((img: any) => img.is_primary);
    let primaryImageUrl = null;
    
    if (primaryImage?.image_url) {
      // Check if image_url is already a full URL or just a path
      if (primaryImage.image_url.startsWith('http')) {
        primaryImageUrl = primaryImage.image_url; // Already a full URL
      } else {
        primaryImageUrl = supabase.storage.from('auction-images').getPublicUrl(primaryImage.image_url).data.publicUrl;
      }
    }
    
    const formattedAuction = {
      ...auction,
      images: auction.auction_images?.map(img => ({
        ...img,
        url: img.image_url?.startsWith('http') 
          ? img.image_url 
          : img.image_url ? supabase.storage.from('auction-images').getPublicUrl(img.image_url).data.publicUrl : null
      })) || [],
      seller: auction.users,
      bid_count: bidCount || 0,
      highest_bidder: bidStats?.[0] || null,
      primary_image: primaryImageUrl,
      time_remaining: new Date(auction.end_time).getTime() - new Date().getTime()
    }
    
    // Remove the joined data to clean up response
    delete formattedAuction.auction_images
    delete formattedAuction.users
    
    return NextResponse.json({
      auction: formattedAuction
    })
    
  } catch (error) {
    console.error('Error fetching auction details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}