import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { StripeService } from "../../../../../lib/stripe";

// PUT - Update auction (only allowed if no bids or auction hasn't started)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ fix: params is Promise
) {
  try {
    const { id: auctionId } = await context.params; // ✅ must await
    const body = await request.json();

    // Get authenticated user
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore cookie errors
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Fetch auction
    const { data: auction, error: auctionError } = await supabaseAdmin
      .from("auctions")
      .select("*")
      .eq("id", auctionId)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    // Check ownership
    if (auction.seller_id !== user.id) {
      return NextResponse.json(
        { error: "Only the auction owner can edit this auction" },
        { status: 403 }
      );
    }

    // Check bids
    const { data: bids, error: bidsError } = await supabaseAdmin
      .from("bids")
      .select("id")
      .eq("auction_id", auctionId)
      .limit(1);

    if (bidsError) {
      console.error("Error checking bids:", bidsError);
      return NextResponse.json(
        { error: "Error checking auction status" },
        { status: 500 }
      );
    }

    if (bids && bids.length > 0) {
      return NextResponse.json(
        { error: "Cannot edit auction that already has bids" },
        { status: 400 }
      );
    }

    // Check start time
    const now = new Date();
    const startTime = new Date(auction.start_time);
    if (now >= startTime) {
      return NextResponse.json(
        { error: "Cannot edit auction that has already started" },
        { status: 400 }
      );
    }

    // Update
    const { data: updatedAuction, error: updateError } = await supabaseAdmin
      .from("auctions")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auctionId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating auction:", updateError);
      return NextResponse.json(
        { error: "Failed to update auction" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, auction: updatedAuction });
  } catch (error) {
    console.error("Auction update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete auction with proper bid handling
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ fix: params is Promise
) {
  try {
    const { id: auctionId } = await context.params; // ✅ must await

    // Get authenticated user
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore cookie errors
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Fetch auction
    const { data: auction, error: auctionError } = await supabaseAdmin
      .from("auctions")
      .select("*")
      .eq("id", auctionId)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (auction.seller_id !== user.id) {
      return NextResponse.json(
        { error: "Only the auction owner can delete this auction" },
        { status: 403 }
      );
    }

    // Get bids
    const { data: bids, error: bidsError } = await supabaseAdmin
      .from("bids")
      .select("*")
      .eq("auction_id", auctionId);

    if (bidsError) {
      console.error("Error fetching bids:", bidsError);
      return NextResponse.json(
        { error: "Error checking auction bids" },
        { status: 500 }
      );
    }

    // Cancel authorizations
    if (bids && bids.length > 0) {
      console.log(`Found ${bids.length} bids to cancel for auction ${auctionId}`);
      for (const bid of bids) {
        if (
          bid.stripe_payment_intent_id &&
          bid.authorization_status === "authorized"
        ) {
          try {
            if (bid.stripe_payment_intent_id.startsWith("pi_test_")) {
              console.log(
                "Cancelling mock payment:",
                bid.stripe_payment_intent_id
              );
            } else {
              await StripeService.cancelPaymentAuthorization(
                bid.stripe_payment_intent_id
              );
              console.log(
                "Cancelled payment authorization:",
                bid.stripe_payment_intent_id
              );
            }
          } catch (error) {
            console.error("Failed to cancel payment authorization:", error);
          }
        }
      }

      await supabaseAdmin
        .from("bids")
        .update({
          status: "cancelled",
          authorization_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("auction_id", auctionId);
    }

    // Delete images
    const { error: imagesError } = await supabaseAdmin
      .from("auction_images")
      .delete()
      .eq("auction_id", auctionId);

    if (imagesError) {
      console.error("Error deleting auction images:", imagesError);
    }

    // Delete auction
    const { error: deleteError } = await supabaseAdmin
      .from("auctions")
      .delete()
      .eq("id", auctionId);

    if (deleteError) {
      console.error("Error deleting auction:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete auction" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Auction deleted successfully. ${
        bids ? bids.length : 0
      } bid authorizations cancelled.`,
    });
  } catch (error) {
    console.error("Auction deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
