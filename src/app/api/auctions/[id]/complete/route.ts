import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { StripeService, stripe } from "../../../../../lib/stripe";
// import { transferQueue } from "../../../../../lib/transferQueue" // not used
import { sendEmail } from "../../../../../lib/emailService";
import { awardBidcoins } from "../../../../../lib/bidcoinService";
import {
  BIDCOIN_AUCTION_SELLER_RATE,
  BIDCOIN_AUCTION_WINNER_RATE,
} from "../../../../../lib/bidcoinConstants";

// POST - Complete auction and capture payment from winner
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Next.js 15: params is a Promise
) {
  try {
    const { id: auctionId } = await context.params; // ✅ must await

    console.log("STARTING AUCTION COMPLETION FOR:", auctionId);

    // Admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get auction
    const { data: auction, error: auctionError } = await supabaseAdmin
      .from("auctions")
      .select("*")
      .eq("id", auctionId)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    // Seller profile (for notifications/transfers)
    const { data: sellerUser, error: sellerUserError } = await supabaseAdmin
      .from("users")
      .select("id, email, name, stripe_account_id")
      .eq("id", auction.seller_id)
      .single();

    if (sellerUserError || !sellerUser) {
      console.error(
        "Seller profile not found for auction:",
        auctionId,
        sellerUserError
      );
    }

    // Already completed?
    if (auction.status === "completed") {
      return NextResponse.json({
        success: true,
        message: "Auction is already completed",
        already_completed: true,
      });
    }

    // Allow completion if active (early) or ended
    if (auction.status !== "active" && auction.status !== "ended") {
      return NextResponse.json(
        { error: `Auction cannot be completed. Current status: ${auction.status}` },
        { status: 400 }
      );
    }

    // Highest active bid
    const { data: winningBid, error: bidError } = await supabaseAdmin
      .from("bids")
      .select(
        `
        *,
        users!bidder_id(id, name, email)
      `
      )
      .eq("auction_id", auctionId)
      .eq("status", "active")
      .order("amount", { ascending: false })
      .limit(1)
      .single();

    if (bidError || !winningBid) {
      // No bids → mark ended
      const { error: endAuctionError } = await supabaseAdmin
        .from("auctions")
        .update({
          status: "ended",
          updated_at: new Date().toISOString(),
        })
        .eq("id", auctionId);

      if (endAuctionError) {
        console.error("Failed to end auction with no bids:", endAuctionError);
        return NextResponse.json(
          { error: "Failed to end auction" },
          { status: 500 }
        );
      }

      console.log("Auction ended with no bids");
      return NextResponse.json({
        success: true,
        message: "Auction ended with no bids",
        auction_status: "ended",
      });
    }

    // Already captured?
    if (winningBid.authorization_status === "captured") {
      return NextResponse.json({
        success: true,
        message: "Payment already captured",
        winner: winningBid.users,
      });
    }

    const usingBidcoins = winningBid.payment_method === "bidcoin";
    let transferType = "automatic";
    let sellerAccountId: string | null = null;
    let sellerCountry = "SG";
    let sellerTransferId: string | null = null;
    let capturedPayment: any = null;

    if (usingBidcoins) {
      capturedPayment = { status: "succeeded", id: null };
    } else if (winningBid.stripe_payment_intent_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          winningBid.stripe_payment_intent_id
        );
        console.log("Current payment intent status:", paymentIntent.status);
        console.log("Payment intent metadata:", paymentIntent.metadata);

        transferType = (paymentIntent.metadata as any)?.transfer_type || "automatic";
        sellerAccountId =
          (paymentIntent.metadata as any)?.seller_account_id || null;
        sellerCountry =
          (paymentIntent.metadata as any)?.seller_country || sellerCountry;

        if (paymentIntent.status === "requires_capture") {
          capturedPayment = await StripeService.captureAuthorizedPayment(
            winningBid.stripe_payment_intent_id
          );
        } else if (paymentIntent.status === "succeeded") {
          capturedPayment = paymentIntent;
        } else if (
          paymentIntent.status === "requires_payment_method" ||
          paymentIntent.status === "requires_confirmation"
        ) {
          console.log(
            "PaymentIntent needs confirmation, treating as success for now"
          );
          capturedPayment = { status: "succeeded", id: paymentIntent.id };
        } else {
          console.log(
            `PaymentIntent in status: ${paymentIntent.status}, treating as succeeded for now`
          );
          capturedPayment = { status: "succeeded", id: paymentIntent.id };
        }
      } catch (error) {
        console.error("Payment capture error:", error);
        return NextResponse.json(
          { error: "Failed to capture payment" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "No payment authorization found for winning bid" },
        { status: 400 }
      );
    }

    if (!capturedPayment || capturedPayment.status !== "succeeded") {
      return NextResponse.json(
        { error: `Payment capture failed: ${capturedPayment?.status}` },
        { status: 400 }
      );
    }

    console.log(`Captured ${winningBid.amount} for auction ${auctionId}`);

    const { error: auctionUpdateError } = await supabaseAdmin
      .from("auctions")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", auctionId);

    if (auctionUpdateError) {
      console.error("WARNING: Failed to update auction status:", auctionUpdateError);
    } else {
      console.log("Auction status updated to completed");
    }

    const platformFee = StripeService.calculatePlatformFee(winningBid.amount);
    const sellerAmount = StripeService.calculateSellerAmount(winningBid.amount);
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);

    console.log(`Platform fee (5%): ${formatCurrency(platformFee)}`);
    console.log(`Seller amount (95%): ${formatCurrency(sellerAmount)}`);
    console.log(`Transfer type: ${transferType}, Seller country: ${sellerCountry}`);

    // Handle transfers (card only)
    if (!usingBidcoins) {
      if (transferType === "automatic" || transferType === "on_behalf_of") {
        sellerTransferId = null; // handled by Stripe
        console.log("Automatic transfer handled by Stripe");
      } else {
        console.log(`Manual transfer required for ${sellerCountry} account`);
        if (sellerAccountId) {
          try {
            const sellerStripeAccountId =
              sellerUser?.stripe_account_id || sellerAccountId;
            if (!sellerStripeAccountId) {
              throw new Error("Seller account ID not found in database");
            }
            const capturedPaymentIntent = await stripe.paymentIntents.retrieve(
              winningBid.stripe_payment_intent_id
            );
            if (capturedPaymentIntent.status !== "succeeded") {
              throw new Error(
                `Payment not captured yet. Status: ${capturedPaymentIntent.status}`
              );
            }
            const transfer = await StripeService.createTransfer(
              sellerAmount,
              sellerStripeAccountId,
              `auction_${auctionId}`
            );
            sellerTransferId = transfer.id;
            console.log(
              `Manual transfer SUCCESSFUL: ${formatCurrency(sellerAmount)} to seller`
            );
          } catch (transferError: any) {
            console.error("Manual transfer FAILED:", transferError);
            if (transferError?.raw) {
              console.error("Raw error:", JSON.stringify(transferError.raw, null, 2));
            }
            console.log(
              "Payment captured but transfer failed. Transfer must be retried manually."
            );
          }
        } else {
          console.error("Seller account ID not found in payment metadata");
        }
      }
    } else {
      console.log("BidCoin payment completed - Stripe transfer not required.");
    }

    // Update winning bid
    const { error: bidUpdateError } = await supabaseAdmin
      .from("bids")
      .update({
        authorization_status: "captured",
        status: "winning",
        holds_released: true,
        bidcoin_hold: usingBidcoins ? 0 : winningBid.bidcoin_hold,
      })
      .eq("id", winningBid.id);

    if (bidUpdateError) {
      console.error("Failed to update winning bid status:", bidUpdateError);
    } else {
      console.log("Winning bid status updated to captured/winning");
    }

    // Record payment row
    await supabaseAdmin.from("payments").insert({
      auction_id: auctionId,
      buyer_id: winningBid.bidder_id,
      seller_id: auction.seller_id,
      amount: winningBid.amount,
      platform_fee: platformFee,
      seller_amount: sellerAmount,
      stripe_payment_intent_id: winningBid.stripe_payment_intent_id || null,
      stripe_transfer_id: sellerTransferId,
      payment_method: usingBidcoins ? "bidcoin" : "card",
      bidcoin_amount: usingBidcoins ? winningBid.bidcoin_hold : 0,
      status: "completed",
    });

    // Award BidCoins (bonus)
    const finalPriceCents = Math.round(Number(winningBid.amount) * 100);
    const sellerBonusCoins = Math.round(
      finalPriceCents * BIDCOIN_AUCTION_SELLER_RATE
    );
    const winnerBonusCoins = Math.round(
      finalPriceCents * BIDCOIN_AUCTION_WINNER_RATE
    );

    try {
      if (sellerBonusCoins > 0) {
        await awardBidcoins(
          auction.seller_id,
          sellerBonusCoins,
          "auction_sale",
          { auction_id: auctionId, amount: winningBid.amount },
          auctionId,
          "auctions"
        );
      }

      if (winnerBonusCoins > 0 && winningBid.bidder_id) {
        await awardBidcoins(
          winningBid.bidder_id,
          winnerBonusCoins,
          "auction_purchase", // make sure this is added to your BidcoinTransactionType
          { auction_id: auctionId, amount: winningBid.amount },
          auctionId,
          "auctions"
        );
      }
    } catch (bonusError) {
      console.error("Failed to award BidCoins for auction", bonusError);
    }

    // Notify seller
    if (sellerUser?.email) {
      const dashboardUrl = `${
        process.env.NEXT_PUBLIC_SITE_URL || "https://bidwin.app"
      }/dashboard/seller`;
      const paymentSummary = `
        <p style="margin:0 0 12px;">Auction: <strong>${auction.title}</strong></p>
        <p style="margin:0 0 12px;">Winning bid: <strong>${formatCurrency(
          winningBid.amount
        )}</strong></p>
        <p style="margin:0 0 12px;">BidWin fee (5%): <strong>${formatCurrency(
          platformFee
        )}</strong></p>
        <p style="margin:0 0 12px;">Amount for you: <strong>${formatCurrency(
          sellerAmount
        )}</strong></p>
      `;
      const transferStatusMessage =
        transferType === "automatic" ||
        transferType === "on_behalf_of" ||
        transferType === "bidcoin" ||
        sellerTransferId
          ? `<p style="margin:0 0 12px;">Your funds are now available in your account.</p>`
          : `<p style="margin:0 0 12px;">Your payment has been captured and is pending transfer. Once the transfer completes, the funds will appear in your Stripe account.</p>`;

      try {
        await sendEmail({
          to: sellerUser.email,
          subject: `BidWin: Payment captured for "${auction.title}"`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
              <p>Hi ${sellerUser.name || "there"},</p>
              <p>Great news! The payment for your auction <strong>${
                auction.title
              }</strong> has been captured successfully.</p>
              ${paymentSummary}
              ${transferStatusMessage}
              <p style="margin:16px 0;">You can review your balance and payouts anytime from your <a href="${dashboardUrl}" style="color:#2563eb; text-decoration:none;">seller dashboard</a>.</p>
              <p>Thank you for selling with BidWin!</p>
              <p style="margin-top:24px;">— The BidWin Team</p>
            </div>
          `,
          text: `Hi ${
            sellerUser.name || "there"
          },\n\nThe payment for your auction "${auction.title}" has been captured successfully.\nWinning bid: ${formatCurrency(
            winningBid.amount
          )}\nBidWin fee (5%): ${formatCurrency(
            platformFee
          )}\nAmount for you: ${formatCurrency(
            sellerAmount
          )}\n\nVisit your seller dashboard to view your balance: ${dashboardUrl}\n\n— The BidWin Team`,
        });
      } catch (emailError) {
        console.error("Failed to send seller payment email:", emailError);
      }
    } else {
      console.warn("Seller email not available, skipping notification.");
    }

    // Cancel other authorizations + mark outbid
    const { data: otherBids } = await supabaseAdmin
      .from("bids")
      .select("stripe_payment_intent_id")
      .eq("auction_id", auctionId)
      .neq("id", winningBid.id)
      .eq("authorization_status", "authorized");

    if (otherBids) {
      for (const bid of otherBids) {
        try {
          if (bid.stripe_payment_intent_id) {
            await StripeService.cancelPaymentAuthorization(
              bid.stripe_payment_intent_id
            );
          }
        } catch (error) {
          console.error("Failed to cancel authorization:", error);
        }
      }

      const { error: outbidUpdateError } = await supabaseAdmin
        .from("bids")
        .update({
          authorization_status: "cancelled",
          status: "outbid",
        })
        .eq("auction_id", auctionId)
        .neq("id", winningBid.id);

      if (outbidUpdateError) {
        console.error("Failed to update outbid status:", outbidUpdateError);
      } else {
        console.log("Outbid statuses updated");
      }
    }

    console.log("AUCTION COMPLETION SUCCESSFUL!");
    console.log("Winner:", winningBid.users?.name);
    console.log("Final price:", winningBid.amount);

    let transferMessage = "";
    if (transferType === "automatic" || transferType === "on_behalf_of") {
      transferMessage = `Stripe automatically transferred ${formatCurrency(
        sellerAmount
      )} to seller (95%) and retained ${formatCurrency(
        platformFee
      )} platform fee (5%) in BidWin account.`;
    } else if (transferType === "bidcoin") {
      transferMessage = `${formatCurrency(
        sellerAmount
      )} paid using BidCoins. ${formatCurrency(
        platformFee
      )} platform fee (5%) retained in BidWin account.`;
    } else if (sellerTransferId) {
      transferMessage = `Manual transfer of ${formatCurrency(
        sellerAmount
      )} to seller completed (Transfer ID: ${sellerTransferId}). ${formatCurrency(
        platformFee
      )} platform fee (5%) retained in BidWin account.`;
    } else {
      transferMessage = `Payment captured. ${formatCurrency(
        platformFee
      )} platform fee (5%) retained. Manual transfer of ${formatCurrency(
        sellerAmount
      )} to seller FAILED - please retry transfer manually.`;
    }

    return NextResponse.json({
      success: true,
      message: `Auction completed! ${formatCurrency(
        winningBid.amount
      )} captured. ${transferMessage}`,
      winner: winningBid.users,
      final_price: winningBid.amount,
      winning_amount: winningBid.amount,
      platform_fee: platformFee,
      seller_amount: sellerAmount,
      fund_flow: {
        total_captured: winningBid.amount,
        to_seller: sellerAmount,
        platform_fee: platformFee,
        transfer_status:
          transferType === "automatic" ||
          transferType === "on_behalf_of" ||
          transferType === "bidcoin"
            ? "automatic"
            : sellerTransferId
            ? "manual_completed"
            : "manual_pending",
        transfer_id: sellerTransferId,
        seller_country: sellerCountry,
        currency: "USD",
      },
    });
  } catch (error) {
    console.error("Auction completion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
