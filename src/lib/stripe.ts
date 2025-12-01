// src/lib/stripe.ts
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

// Do NOT set apiVersion here to avoid literal mismatch type errors.
// It will default to the version bundled with your installed stripe package.
export const stripe = new Stripe(key);

export class StripeService {
  // Create a Stripe customer
  static async createCustomer(
    email: string,
    name: string
  ): Promise<Stripe.Customer> {
    return await stripe.customers.create({ email, name });
  }

  // Create a connected account for sellers with enhanced data
  static async createConnectedAccount(sellerData: {
    email: string;
    name: string;
    userId: string;
  }): Promise<Stripe.Account> {
    const [firstName, ...rest] = sellerData.name.trim().split(" ");
    const lastName = rest.join(" ") || firstName;

    return await stripe.accounts.create({
      type: "express",
      country: "SG",
      email: sellerData.email,
      business_type: "individual",
      individual: {
        email: sellerData.email,
        first_name: firstName,
        last_name: lastName,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        user_id: sellerData.userId,
        platform: "BidWin",
      },
    });
  }

  // Create account link for seller onboarding
  static async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string
  ): Promise<Stripe.AccountLink> {
    return await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
  }

  // Create payment intent for immediate charge with automatic transfer to connected account
  static async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    connectedAccountId: string,
    platformFeeAmount: number,
    transferGroup?: string
  ): Promise<Stripe.PaymentIntent> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // cents
      currency: (currency || "usd").toLowerCase(),
      customer: customerId,
      application_fee_amount: Math.round(platformFeeAmount * 100), // cents
      transfer_data: {
        destination: connectedAccountId, // remainder goes to seller
      },
      on_behalf_of: connectedAccountId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        purpose: "auction_payment",
        seller_account_id: connectedAccountId,
        platform_fee: platformFeeAmount.toString(),
        seller_amount: (amount - platformFeeAmount).toString(),
      },
    };

    if (transferGroup) {
      // only add when present to avoid `undefined` type issues
      (params as any).transfer_group = transferGroup;
      params.metadata!["transfer_group"] = transferGroup;
    }

    return await stripe.paymentIntents.create(params);
  }

  // Confirm payment intent
  static async confirmPaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.confirm(paymentIntentId);
  }

  /**
   * Create a manual transfer from platform to connected account (fallback).
   * NOTE: When you use application_fee_amount + transfer_data on the PaymentIntent,
   * Stripe automatically routes funds. Use this only for edge cases.
   */
  static async createTransfer(
    amount: number,
    connectedAccountId: string,
    transferGroup?: string
  ): Promise<Stripe.Transfer> {
    try {
      console.log(
        `Attempting transfer: $${amount} to ${connectedAccountId}`
      );

      const metadata: Record<string, string> = {
        purpose: "auction_payout",
        seller_account_id: connectedAccountId,
      };
      if (transferGroup) {
        metadata.transfer_group = transferGroup;
      }

      const params: Stripe.TransferCreateParams = {
        amount: Math.round(amount * 100), // cents
        currency: "usd",
        destination: connectedAccountId,
        description: transferGroup
          ? `BidWin auction payout - ${transferGroup}`
          : "BidWin auction payout",
        metadata,
      };

      if (transferGroup) {
        // Avoid `string | undefined` → pass only when defined
        (params as any).transfer_group = transferGroup;
      }

      const transfer = await stripe.transfers.create(params, {
        idempotencyKey: `transfer_${connectedAccountId}_${amount}_${Date.now()}`,
      });

      console.log(`✅ Transfer successful: ${transfer.id}`);
      return transfer;
    } catch (error: unknown) {
      // Proper narrowing for unknown
      if (error instanceof Error) {
        console.error(`❌ Transfer failed: ${error.message}`);
      } else {
        console.error("❌ Transfer failed with unknown error:", error);
      }

      // Log Stripe parameter if present (keep type-safe)
      if (typeof error === "object" && error && "param" in error) {
        console.error(`Error parameter: ${(error as any).param}`);
      }
      throw error;
    }
  }

  // Refund payment (full or partial if amount provided)
  static async refundPayment(
    paymentIntentId: string,
    amount?: number
  ): Promise<Stripe.Refund> {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };
    if (typeof amount === "number") {
      refundData.amount = Math.round(amount * 100);
    }
    return await stripe.refunds.create(refundData);
  }

  // Retrieve account status
  static async getAccountStatus(
    accountId: string
  ): Promise<Stripe.Account> {
    return await stripe.accounts.retrieve(accountId);
  }

  // Ensure account has required capabilities for transfers
  static async ensureAccountCapabilities(
    accountId: string
  ): Promise<Stripe.Account> {
    const account = await stripe.accounts.retrieve(accountId);
    const transfersCapability = account.capabilities?.transfers;

    if (transfersCapability !== "active") {
      return await stripe.accounts.update(accountId, {
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
    }
    return account;
  }

  // Calculate platform fee (5% of transaction)
  static calculatePlatformFee(amount: number): number {
    return Math.round(amount * 0.05 * 100) / 100; // keep 2 decimals
  }

  // Amount that goes to seller after platform fee
  static calculateSellerAmount(amount: number): number {
    const platformFee = this.calculatePlatformFee(amount);
    return Math.round((amount - platformFee) * 100) / 100;
  }

  // Create PaymentIntent for authorization-only (capture later)
  static async authorizePayment(
    amount: number,
    currency: string,
    customerId: string,
    connectedAccountId: string,
    platformFeeAmount: number,
    metadata: Record<string, string> = {},
    transferGroup?: string
  ): Promise<Stripe.PaymentIntent> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100),
      currency: (currency || "usd").toLowerCase(),
      customer: customerId,
      application_fee_amount: Math.round(platformFeeAmount * 100),
      transfer_data: { destination: connectedAccountId },
      on_behalf_of: connectedAccountId,
      capture_method: "manual",
      confirm: false,
      payment_method_types: ["card"],
      metadata: {
        ...metadata,
        purpose: "bid_authorization",
        seller_account_id: connectedAccountId,
        platform_fee: platformFeeAmount.toString(),
        seller_amount: (amount - platformFeeAmount).toString(),
        transfer_type: "automatic",
        seller_country: "SG",
      },
    };

    if (transferGroup) {
      (params as any).transfer_group = transferGroup;
      params.metadata!["transfer_group"] = transferGroup;
    }

    return await stripe.paymentIntents.create(params);
  }

  // Capture an authorized payment
  static async captureAuthorizedPayment(
    paymentIntentId: string
  ): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.capture(paymentIntentId);
  }

  // Cancel an authorization (release hold)
  static async cancelPaymentAuthorization(
    paymentIntentId: string
  ): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.cancel(paymentIntentId);
  }

  // Confirm authorization with a specific payment method
  static async confirmPaymentAuthorization(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });
  }
}

export default StripeService;
