import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export class StripeService {
  // Create a Stripe customer
  static async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    return await stripe.customers.create({
      email,
      name,
    })
  }

  // Create a connected account for sellers with enhanced data
  static async createConnectedAccount(sellerData: {
    email: string;
    name: string;
    userId: string;
  }): Promise<Stripe.Account> {
    return await stripe.accounts.create({
      type: 'express',
      country: 'SG', // Singapore
      email: sellerData.email,
      business_type: 'individual',
      individual: {
        email: sellerData.email,
        first_name: sellerData.name.split(' ')[0],
        last_name: sellerData.name.split(' ').slice(1).join(' ') || sellerData.name,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual'
          }
        }
      },
      metadata: {
        user_id: sellerData.userId,
        platform: 'BidWin'
      }
    })
  }

  // Create account link for seller onboarding
  static async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<Stripe.AccountLink> {
    return await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })
  }

  // Create payment intent for auction payment
  static async createPaymentIntent(
    amount: number,
    currency: string = 'sgd',
    customerId: string,
    connectedAccountId: string,
    platformFeeAmount: number
  ): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      application_fee_amount: Math.round(platformFeeAmount * 100), // Platform fee in cents
      transfer_data: {
        destination: connectedAccountId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })
  }

  // Confirm payment intent
  static async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.confirm(paymentIntentId)
  }

  // Create transfer to seller (manual transfer if needed)
  static async createTransfer(
    amount: number,
    connectedAccountId: string,
    transferGroup?: string
  ): Promise<Stripe.Transfer> {
    return await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'sgd',
      destination: connectedAccountId,
      transfer_group: transferGroup,
    })
  }

  // Refund payment
  static async refundPayment(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    }
    
    if (amount) {
      refundData.amount = Math.round(amount * 100) // Convert to cents
    }

    return await stripe.refunds.create(refundData)
  }

  // Get account status
  static async getAccountStatus(accountId: string): Promise<Stripe.Account> {
    return await stripe.accounts.retrieve(accountId)
  }

  // Ensure account has required capabilities for transfers
  static async ensureAccountCapabilities(accountId: string): Promise<Stripe.Account> {
    const account = await stripe.accounts.retrieve(accountId)
    
    // Check if transfers capability is missing or not active
    const transfersCapability = account.capabilities?.transfers
    
    if (transfersCapability !== 'active') {
      // Update account to request transfers capability
      const updatedAccount = await stripe.accounts.update(accountId, {
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        }
      })
      return updatedAccount
    }
    
    return account
  }

  // Calculate platform fee (5% of transaction)
  static calculatePlatformFee(amount: number): number {
    return Math.round(amount * 0.05 * 100) / 100 // 5% fee, rounded to 2 decimal places
  }

  // Calculate seller amount after platform fee
  static calculateSellerAmount(amount: number): number {
    const platformFee = this.calculatePlatformFee(amount)
    return Math.round((amount - platformFee) * 100) / 100
  }

  // Create payment intent for authorization only (hold funds in BidWin account)
  static async authorizePayment(
    amount: number,
    currency: string = 'sgd',
    customerId: string,
    connectedAccountId: string, // Still needed for metadata, but not for direct transfer
    platformFeeAmount: number,
    metadata: Record<string, string> = {}
  ): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents - FULL AMOUNT TO BIDWIN
      currency,
      customer: customerId,
      // NO application_fee_amount or transfer_data - funds stay in BidWin account
      capture_method: 'manual', // Authorization only, capture later
      confirm: false, // Don't auto-confirm
      payment_method_types: ['card'], // Specify allowed payment methods
      metadata: {
        ...metadata,
        type: 'bid_authorization',
        seller_account_id: connectedAccountId, // Store for later transfer
        platform_fee: platformFeeAmount.toString(),
        seller_amount: (amount - platformFeeAmount).toString()
      }
    })
  }

  // Capture authorized payment (convert authorization to actual charge)
  static async captureAuthorizedPayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.capture(paymentIntentId)
  }

  // Cancel payment authorization (release hold)
  static async cancelPaymentAuthorization(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.cancel(paymentIntentId)
  }

  // Confirm payment intent for authorization
  static async confirmPaymentAuthorization(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId
    })
  }
}

export default StripeService