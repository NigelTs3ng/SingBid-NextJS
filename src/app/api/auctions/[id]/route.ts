import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

interface AuctionImage {
  id: string;
  auction_id: string;
  image_url: string | null;
  image_path?: string | null;
  display_order?: number | null;
  is_primary?: boolean | null;
  file_size?: number | null;
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  alt_text?: string | null;
  created_at?: string | null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Next 15 expects Promise
) {
  try {
    const { id: auctionId } = await context.params; // ✅ must await

    if (!auctionId) {
      return NextResponse.json(
        { error: "Auction ID is required" },
        { status: 400 }
      );
    }

    // ─── Fetch auction + related data ────────────────────────────────────────────
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select(
        "*, auction_images(*), users!seller_id(id,name,email,created_at)"
      )
      .eq("id", auctionId)
      .single();

    if (auctionError || !auction) {
      console.error("Error fetching auction:", auctionError);
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    // ─── Highest bid & count ─────────────────────────────────────────────────────
    const { data: bidStats } = await supabase
      .from("bids")
      .select("id, amount, bidder_id, users!bidder_id(name)")
      .eq("auction_id", auctionId)
      .order("amount", { ascending: false })
      .limit(1);

    const { count: bidCount } = await supabase
      .from("bids")
      .select("id", { count: "exact" })
      .eq("auction_id", auctionId);

    // ─── Sort images ─────────────────────────────────────────────────────────────
    const sortedImages: AuctionImage[] = (auction.auction_images || []).sort(
      (a: AuctionImage, b: AuctionImage) => {
        const orderA =
          a.display_order ?? (a.is_primary ? 0 : 999);
        const orderB =
          b.display_order ?? (b.is_primary ? 0 : 999);
        return orderA - orderB;
      }
    );

    // ─── Determine primary image ─────────────────────────────────────────────────
    const primaryImage = sortedImages.find((img) => img.is_primary);
    let primaryImageUrl: string | null = null;

    const resolveImageUrl = (imageUrl?: string | null): string | null => {
      if (!imageUrl) return null;
      return imageUrl.startsWith("http")
        ? imageUrl
        : supabase.storage.from("auction-images").getPublicUrl(imageUrl).data
            .publicUrl ?? null;
    };

    if (primaryImage) {
      primaryImageUrl = resolveImageUrl(primaryImage.image_url);
    } else if (sortedImages.length > 0) {
      primaryImageUrl = resolveImageUrl(sortedImages[0].image_url);
    }

    // ─── Format auction data ─────────────────────────────────────────────────────
    const formattedAuction = {
      ...auction,
      images:
        sortedImages.map((img: AuctionImage) => ({
          ...img,
          url: resolveImageUrl(img.image_url),
        })) || [],
      seller: auction.users,
      bid_count: bidCount || 0,
      highest_bidder: bidStats?.[0] || null,
      primary_image: primaryImageUrl,
      time_remaining:
        new Date(auction.end_time).getTime() - new Date().getTime(),
    };

    delete formattedAuction.auction_images;
    delete formattedAuction.users;

    return NextResponse.json({ auction: formattedAuction });
  } catch (error) {
    console.error("Error fetching auction details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
