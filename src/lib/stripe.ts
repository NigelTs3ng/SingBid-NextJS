import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export class StripeService {
  // Create a Stripe customer
  static async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    return await stripe.customers.create({
      email,
      name,
    })
  }

  // Create a connected account for sellers
  static async createConnectedAccount(email: string): Promise<Stripe.Account> {
    return await stripe.accounts.create({
      type: 'express',
      country: 'SG', // Singapore
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
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

  // Calculate platform fee (5% of transaction)
  static calculatePlatformFee(amount: number): number {
    return Math.round(amount * 0.05 * 100) / 100 // 5% fee, rounded to 2 decimal places
  }

  // Calculate seller amount after platform fee
  static calculateSellerAmount(amount: number): number {
    const platformFee = this.calculatePlatformFee(amount)
    return Math.round((amount - platformFee) * 100) / 100
  }
}

export default StripeService