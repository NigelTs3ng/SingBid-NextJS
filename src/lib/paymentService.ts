import { supabase, Database } from './supabase'
import StripeService from './stripe'

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
type AuctionStatus = 'active' | 'ended' | 'cancelled'

export class PaymentService {
  // Create or get Stripe customer for user
  static async ensureStripeCustomer(userId: string, email: string, name: string): Promise<string> {
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (user?.stripe_customer_id) {
      return user.stripe_customer_id
    }

    const customer = await StripeService.createCustomer(email, name)

    await supabase
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId)

    return customer.id
  }

  // Create seller account and onboarding link
  static async createSellerAccount(
    userId: string,
    email?: string
  ): Promise<{ accountId: string; onboardingUrl: string }> {
    // Check if seller account already exists
    const { data: existingAccount } = await supabase
      .from('seller_accounts')
      .select('*')
      .eq('user_id', userId)
      .single()

    let accountId: string

    if (existingAccount) {
      accountId = existingAccount.stripe_account_id
    } else {
      // Fetch user to get name/email if not provided
      const { data: userRow } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single()

      const sellerEmail = email ?? userRow?.email ?? ''
      const sellerName = userRow?.name ?? 'Seller'

      // ✅ Pass the correct object shape to StripeService
      const account = await StripeService.createConnectedAccount({
        email: sellerEmail,
        name: sellerName,
        userId,
      })
      accountId = account.id

      // Save to database
      await supabase.from('seller_accounts').insert({
        user_id: userId,
        stripe_account_id: accountId,
        account_status: 'pending',
        onboarding_completed: false,
      })
    }

    // Create onboarding link
    const accountLink = await StripeService.createAccountLink(
      accountId,
      `${process.env.NEXTAUTH_URL}/seller/onboard/refresh`,
      `${process.env.NEXTAUTH_URL}/seller/onboard/complete`
    )

    return {
      accountId,
      onboardingUrl: accountLink.url,
    }
  }

  // Process payment for winning bid
  static async processAuctionPayment(
    auctionId: string,
    winnerId: string
  ): Promise<{
    success: boolean
    paymentIntentId?: string
    clientSecret?: string
    error?: string
  }> {
    try {
      // Get auction details
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .select(
          `
          *,
          seller_accounts!inner(stripe_account_id, account_status)
        `
        )
        .eq('id', auctionId)
        .single()

      if (auctionError || !auction) {
        return { success: false, error: 'Auction not found' }
      }

      if (auction.status !== 'ended') {
        return { success: false, error: 'Auction is not ended' }
      }

      // Check if seller has valid connected account
      const sellerAccount = (auction as any).seller_accounts
      if (!sellerAccount || sellerAccount.account_status !== 'active') {
        return { success: false, error: 'Seller account not ready for payments' }
      }

      // Get winner's details
      const { data: winner, error: winnerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', winnerId)
        .single()

      if (winnerError || !winner) {
        return { success: false, error: 'Winner not found' }
      }

      // Ensure winner has Stripe customer
      const customerId = await this.ensureStripeCustomer(
        winner.id,
        winner.email,
        winner.name
      )

      // Calculate amounts
      const totalAmount = auction.current_price
      const platformFee = StripeService.calculatePlatformFee(totalAmount)
      const sellerAmount = StripeService.calculateSellerAmount(totalAmount)

      // Create payment intent
      const paymentIntent = await StripeService.createPaymentIntent(
        totalAmount,
        'usd',
        customerId,
        sellerAccount.stripe_account_id,
        platformFee
      )

      // Record payment in database
      await supabase.from('payments').insert({
        auction_id: auctionId,
        buyer_id: winnerId,
        seller_id: auction.seller_id,
        amount: totalAmount,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
      })

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      return { success: false, error: 'Payment processing failed' }
    }
  }

  // Handle successful payment (webhook or client confirmation)
  static async confirmPayment(paymentIntentId: string): Promise<boolean> {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_payment_intent_id', paymentIntentId)
        .select('*')
        .single()

      if (error || !payment) {
        console.error('Error updating payment:', error)
        return false
      }

      await supabase
        .from('bids')
        .update({ status: 'winning' })
        .eq('auction_id', payment.auction_id)
        .eq('bidder_id', payment.buyer_id)

      return true
    } catch (error) {
      console.error('Error confirming payment:', error)
      return false
    }
  }

  // Handle failed payment
  static async handleFailedPayment(paymentIntentId: string, reason: string): Promise<void> {
    try {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_payment_intent_id', paymentIntentId)
      // Optionally notify parties
    } catch (error) {
      console.error('Error handling failed payment:', error)
    }
  }

  // Process refund
  static async processRefund(
    paymentId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single()

      if (paymentError || !payment) {
        return { success: false, error: 'Payment not found' }
      }

      if (payment.status !== 'completed') {
        return { success: false, error: 'Can only refund completed payments' }
      }

      await StripeService.refundPayment(payment.stripe_payment_intent_id)

      await supabase
        .from('payments')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)

      return { success: true }
    } catch (error) {
      console.error('Refund processing error:', error)
      return { success: false, error: 'Refund processing failed' }
    }
  }

  // Get payment history for user
  static async getUserPayments(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(
        `
        *,
        auctions(title, description),
        buyers:users!buyer_id(name, email),
        sellers:users!seller_id(name, email)
      `
      )
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching payments:', error)
      return []
    }

    return data || []
  }

  // Check seller account status
  static async getSellerAccountStatus(userId: string): Promise<{
    hasAccount: boolean
    accountStatus?: string
    onboardingCompleted?: boolean
    accountId?: string
  }> {
    const { data: account, error } = await supabase
      .from('seller_accounts')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !account) {
      return { hasAccount: false }
    }

    return {
      hasAccount: true,
      accountStatus: account.account_status,
      onboardingCompleted: account.onboarding_completed,
      accountId: account.stripe_account_id,
    }
  }

  // Update seller account status (called by webhook)
  static async updateSellerAccountStatus(
    stripeAccountId: string,
    status: 'pending' | 'active' | 'rejected',
    onboardingCompleted: boolean = false
  ): Promise<void> {
    await supabase
      .from('seller_accounts')
      .update({
        account_status: status,
        onboarding_completed: onboardingCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', stripeAccountId)
  }
}

export default PaymentService
