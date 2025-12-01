import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabase } from "../../../lib/supabase";
import ImageService, { AuctionImage } from "../../../lib/imageService";

// Minimal shape we need from the auctions table for this handler
interface AuctionRow {
  id: string;
  title: string;
  description?: string | null;
  starting_price: number | string;
  current_price?: number | string | null;
  seller_id: string;
  end_time: string;
  status: string;
  created_at?: string;
  auction_images?: AuctionImage[] | null;
  // Allow other fields without typing them all
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/auctions called");

    // Create admin client for operations that bypass RLS
    // (kept as require to match your existing code pattern)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require("@supabase/supabase-js");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // bypasses RLS
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Get authenticated user from cookies or Authorization header
    const cookieStore = await cookies();
    const authCookies = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join(";");
    console.log(
      "Auth cookies available:",
      cookieStore.getAll().map((c) => c.name)
    );

    let user: any = null;
    let authError: any = null;

    // 1) Authorization: Bearer
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      console.log("Got Bearer token from Authorization header");

      try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        user = data?.user;
        authError = error;
        console.log("User from token:", user?.id, "Error:", authError?.message);
      } catch (err) {
        console.error("Error getting user from token:", err);
        authError = err;
      }
    }

    // 2) Cookies fallback
    if (!user) {
      try {
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
                  // ignore cookie set errors in API routes
                }
              },
            },
          }
        );

        const { data, error } = await supabaseAuth.auth.getUser();
        user = data?.user;
        authError = error;
        console.log(
          "User from cookies:",
          user?.id,
          "Error:",
          authError?.message
        );
      } catch (err) {
        console.error("Error getting user from cookies:", err);
        authError = err;
      }
    }

    if (authError || !user) {
      console.log("Authentication failed:", {
        authError: authError?.message,
        hasUser: !!user,
      });
      return NextResponse.json(
        {
          error: "Authentication required",
          details: authError?.message || "No auth session found",
        },
        { status: 401 }
      );
    }

    console.log("User authenticated:", user.id);

    // Verify user is a seller - use admin client to avoid RLS issues
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("user_role")
      .eq("id", user.id)
      .single();

    console.log("User profile:", userProfile, "Profile error:", profileError);

    if (profileError) {
      if ((profileError as any).code === "PGRST116") {
        // User doesn't exist in users table - create them
        console.log("Creating missing user profile...");

        const { data: newUser, error: createError } = await supabaseAdmin
          .from("users")
          .insert({
            id: user.id,
            email: user.email,
            name:
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "User",
            user_role: "seller",
          })
          .select()
          .single();

        if (createError) {
          console.log("Failed to create user:", createError);
          return NextResponse.json(
            {
              error: "Failed to create user profile",
              details: createError.message,
            },
            { status: 500 }
          );
        }

        console.log("User created successfully:", newUser);
      } else {
        console.log("Unexpected profile fetch error:", profileError);
        return NextResponse.json(
          {
            error: "Failed to fetch user profile",
            details: (profileError as any).message,
          },
          { status: 500 }
        );
      }
    } else if (userProfile?.user_role !== "seller") {
      return NextResponse.json(
        { error: "Seller account required", userRole: userProfile?.user_role },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      starting_price,
      end_time,
      category,
      condition,
      location,
      images = [],
    } = body;

    // Validate required fields
    if (!title || !description || !starting_price || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate price
    const price = parseFloat(starting_price);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: "Starting price must be a positive number" },
        { status: 400 }
      );
    }

    // Validate end time
    const endDate = new Date(end_time);
    if (endDate <= new Date()) {
      return NextResponse.json(
        { error: "End time must be in the future" },
        { status: 400 }
      );
    }

    // Create auction using service role to bypass RLS
    const { data: auctionData, error: auctionError } = await supabaseAdmin
      .from("auctions")
      .insert({
        title,
        description,
        starting_price: price,
        current_price: price,
        seller_id: user.id,
        end_time,
        status: "active",
      })
      .select()
      .single();

    if (auctionError) {
      console.error("Auction creation error:", auctionError);
      return NextResponse.json(
        { error: "Failed to create auction" },
        { status: 500 }
      );
    }

    // Save images if provided - use admin client to bypass RLS
    let savedImages: AuctionImage[] = [];
    if (Array.isArray(images) && images.length > 0) {
      try {
        console.log("Processing images:", images);

        const imagePromises = images.map(
          async (image: any, index: number): Promise<AuctionImage | null> => {
            const imageData = {
              auction_id: auctionData.id,
              image_url: image.url || image.image_url, // full public URL
              image_path: image.image_path || image.path, // storage path
              display_order: index,
              is_primary: index === 0,
              file_size: image.file_size,
              mime_type: image.mime_type,
              width: image.width,
              height: image.height,
              alt_text: image.alt_text || image.name,
            };

            console.log("Saving image metadata:", imageData);

            const { data, error } = await supabaseAdmin
              .from("auction_images")
              .insert(imageData)
              .select()
              .single();

            if (error) {
              console.error("Database save error:", error);
              return null;
            }

            console.log("Image saved successfully:", data);
            return data as AuctionImage;
          }
        );

        const results = await Promise.all(imagePromises);
        savedImages = results.filter(Boolean) as AuctionImage[];
        console.log("Saved images:", savedImages);
      } catch (err) {
        console.error("Error saving images:", err);
        // Continue even if images fail to save
      }
    }

    return NextResponse.json({
      success: true,
      auction: auctionData,
      images: savedImages,
    });
  } catch (err) {
    console.error("Auction creation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require("@supabase/supabase-js");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const status = searchParams.get("status") || "active";
    const sellerId = searchParams.get("seller_id");

    const offset = (page - 1) * limit;

    // Build query with admin client
    let query = supabaseAdmin
      .from("auctions")
      .select(
        "*,auction_images(id,auction_id,image_url,image_path,display_order,is_primary,file_size,mime_type,width,height,alt_text,created_at)"
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (sellerId) {
      query = query.eq("seller_id", sellerId);
    }

    const { data: auctions, error } = await query;

    if (error) {
      console.error("Error fetching auctions:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: error.message || "Failed to fetch auctions", details: error },
        { status: 500 }
      );
    }

    // Cast to a typed array before mapping
    const typedAuctions = (auctions || []) as AuctionRow[];

    // Format response with primary images and Supabase storage URLs
    const formattedAuctions = typedAuctions.map((auction: AuctionRow) => {
      // Sort images by display_order
      const sortedImages = (auction.auction_images || []).sort(
        (a: AuctionImage, b: AuctionImage) => {
          const orderA =
            a.display_order !== null && a.display_order !== undefined
              ? a.display_order
              : a.is_primary
              ? 0
              : 999;
          const orderB =
            b.display_order !== null && b.display_order !== undefined
              ? b.display_order
              : b.is_primary
              ? 0
              : 999;
          return orderA - orderB;
        }
      );

      const primaryImage = sortedImages.find((img: AuctionImage) => img.is_primary);
      let primaryImageUrl: string | null = null;

      if (primaryImage?.image_url) {
        primaryImageUrl = primaryImage.image_url.startsWith("http")
          ? primaryImage.image_url
          : supabaseAdmin.storage
              .from("auction-images")
              .getPublicUrl(primaryImage.image_url).data.publicUrl;
      } else if (sortedImages.length > 0) {
        const firstImage = sortedImages[0];
        if (firstImage.image_url) {
          primaryImageUrl = firstImage.image_url.startsWith("http")
            ? firstImage.image_url
            : supabaseAdmin.storage
                .from("auction-images")
                .getPublicUrl(firstImage.image_url).data.publicUrl;
        }
      }

      return {
        ...auction,
        primary_image: primaryImageUrl,
        image_count: sortedImages.length,
        images:
          sortedImages.map((img: AuctionImage) => ({
            ...img,
            url: img.image_url?.startsWith("http")
              ? img.image_url
              : img.image_url
              ? supabaseAdmin.storage
                  .from("auction-images")
                  .getPublicUrl(img.image_url).data.publicUrl
              : null,
          })) || [],
      };
    });

    return NextResponse.json({
      auctions: formattedAuctions,
      page,
      limit,
      total: formattedAuctions.length,
    });
  } catch (err) {
    console.error("Error fetching auctions:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
