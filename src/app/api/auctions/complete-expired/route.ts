import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface Auction {
  id: string;
  title: string;
  end_time: string;
}

interface CompletionResult {
  auctionId: string;
  title: string;
  status: "completed" | "failed" | "error";
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const now = new Date().toISOString();
    const { data: expiredAuctions, error: auctionsError } = await supabaseAdmin
      .from("auctions")
      .select("id, title, end_time")
      .eq("status", "active")
      .lt("end_time", now);

    if (auctionsError) {
      console.error("Error fetching expired auctions:", auctionsError);
      return NextResponse.json(
        { error: "Failed to fetch expired auctions" },
        { status: 500 }
      );
    }

    if (!expiredAuctions || expiredAuctions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired auctions found",
        completed: 0,
      });
    }

    console.log(`Found ${expiredAuctions.length} expired auctions to complete`);

    const results: CompletionResult[] = [];

    for (const auction of expiredAuctions as Auction[]) {
      try {
        const completionResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/auctions/${auction.id}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        const completionResult = await completionResponse.json();

        if (completionResponse.ok) {
          results.push({
            auctionId: auction.id,
            title: auction.title,
            status: "completed",
            message: completionResult.message,
          });
          console.log(`Completed auction ${auction.id}: ${auction.title}`);
        } else {
          results.push({
            auctionId: auction.id,
            title: auction.title,
            status: "failed",
            error: completionResult.error,
          });
          console.error(
            `Failed to complete auction ${auction.id}:`,
            completionResult.error
          );
        }
      } catch (err: unknown) {
        // ✅ Type-safe catch block
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error occurred";
        results.push({
          auctionId: auction.id,
          title: auction.title,
          status: "error",
          error: errorMsg,
        });
        console.error(`Error completing auction ${auction.id}:`, err);
      }
    }

    const completedCount = results.filter((r) => r.status === "completed").length;
    const failedCount = results.filter((r) => r.status !== "completed").length;

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredAuctions.length} expired auctions. ${completedCount} completed, ${failedCount} failed.`,
      completed: completedCount,
      failed: failedCount,
      results,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    console.error("Auto-completion error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// ───────────────────────────────────────────────────────────────
// GET - For monitoring expired auctions
// ───────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const now = new Date().toISOString();
    const { data: expiredAuctions, error: auctionsError } = await supabaseAdmin
      .from("auctions")
      .select(
        `
        id, 
        title, 
        end_time, 
        current_price,
        seller_id,
        users!seller_id(name, email)
      `
      )
      .eq("status", "active")
      .lt("end_time", now)
      .order("end_time", { ascending: true });

    if (auctionsError) {
      console.error("Error fetching expired auctions:", auctionsError);
      return NextResponse.json(
        { error: "Failed to fetch expired auctions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: expiredAuctions?.length || 0,
      auctions: expiredAuctions || [],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    console.error("Error checking expired auctions:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
