// Payment Service for SingBid 6-Step Stripe Payment Flow
import stripe, { STRIPE_CONFIG, PAYMENT_STEPS, PAYMENT_STATUSES } from './stripe.js';
import { supabase } from './supabase.js';

export class PaymentService {
  // ===================== STEP 1: BID PLACEMENT - PRE-AUTHORIZATION =====================
  /**
   * Create a PaymentIntent for bid pre-authorization
   * This holds funds on the buyer's card without capturing them
   */
  static async createBidPaymentIntent({ auctionId, bidderId, amount, paymentMethodId }) {
    try {
      // Get auction details
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .select('*, seller_id')
        .eq('id', auctionId)
        .single();

      if (auctionError || !auction) {
        throw new Error('Auction not found');
      }

      // Check if seller has Stripe Connect account
      const { data: sellerAccount } = await supabase
        .from('stripe_accounts')
        .select('*')
        .eq('user_id', auction.seller_id)
        .single();

      if (!sellerAccount || !sellerAccount.payouts_enabled) {
        throw new Error('Seller payment account not set up');
      }

      // Calculate fees
      const platformFee = Math.round(amount * STRIPE_CONFIG.platformFeeRate / 100 * 100); // Convert to cents
      const amountInCents = Math.round(amount * 100);

      // Create PaymentIntent with manual capture
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: STRIPE_CONFIG.currency,
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        capture_method: 'manual', // Don't capture immediately
        confirm: true,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/auction-details/${auctionId}`,
        application_fee_amount: platformFee,
        transfer_data: {
          destination: sellerAccount.stripe_account_id,
        },
        metadata: {
          auction_id: auctionId,
          bidder_id: bidderId,
          seller_id: auction.seller_id,
          step: 'pre_authorization',
        },
      });

      // Store payment in database
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: bidderId,
          auction_id: auctionId,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_client_secret: paymentIntent.client_secret,
          amount: amount,
          currency: STRIPE_CONFIG.currency,
          payment_step: PAYMENT_STEPS.PRE_AUTHORIZED,
          status: paymentIntent.status,
          pre_authorized_at: new Date().toISOString(),
          payment_method_id: paymentMethodId,
          metadata: {
            seller_id: auction.seller_id,
            platform_fee: platformFee / 100,
          },
        })
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Database error: ${paymentError.message}`);
      }

      // Log the step
      await this.logPaymentStep({
        paymentId: payment.id,
        step: 'pre_authorization',
        status: 'success',
        stripeResponse: paymentIntent,
      });

      return {
        payment,
        paymentIntent,
        requiresAction: paymentIntent.status === 'requires_action',
        clientSecret: paymentIntent.client_secret,
      };

    } catch (error) {
      console.error('Error creating bid payment intent:', error);
      throw error;
    }
  }

  // ===================== STEP 2: AUCTION FINALIZATION - CAPTURE =====================
  /**
   * Capture the pre-authorized payment when auction ends and winner is determined
   */
  static async captureWinningBid({ auctionId, winningBidId }) {
    try {
      // Get the winning bid's payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('payment_step', PAYMENT_STEPS.PRE_AUTHORIZED)
        .single();

      if (paymentError || !payment) {
        throw new Error('Pre-authorized payment not found');
      }

      // Capture the PaymentIntent
      const paymentIntent = await stripe.paymentIntents.capture(
        payment.stripe_payment_intent_id,
        {
          amount_to_capture: Math.round(payment.amount * 100), // Convert to cents
        }
      );

      // Update payment in database
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
          payment_step: PAYMENT_STEPS.CAPTURED,
          status: paymentIntent.status,
          captured_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Database update error: ${updateError.message}`);
      }

      // Log the step
      await this.logPaymentStep({
        paymentId: payment.id,
        step: 'capture',
        status: 'success',
        stripeResponse: paymentIntent,
      });

      // The database trigger will automatically create the escrow hold
      return { payment: updatedPayment, paymentIntent };

    } catch (error) {
      console.error('Error capturing payment:', error);
      throw error;
    }
  }

  // ===================== STEP 3: BUYER PROTECTION - ESCROW =====================
  /**
   * Get escrow status for a payment
   */
  static async getEscrowStatus({ paymentId }) {
    try {
      const { data: escrowHold, error } = await supabase
        .from('escrow_holds')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (error) {
        throw new Error(`Escrow hold not found: ${error.message}`);
      }

      return escrowHold;
    } catch (error) {
      console.error('Error getting escrow status:', error);
      throw error;
    }
  }

  // ===================== STEP 4: PAYOUT - RELEASE FUNDS =====================
  /**
   * Release funds from escrow (manual confirmation by buyer)
   */
  static async confirmDeliveryAndRelease({ auctionId, buyerId }) {
    try {
      // Get the payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('user_id', buyerId)
        .eq('payment_step', PAYMENT_STEPS.IN_ESCROW)
        .single();

      if (paymentError || !payment) {
        throw new Error('Escrowed payment not found');
      }

      // Update delivery confirmation
      const { error: deliveryError } = await supabase
        .from('delivery_confirmations')
        .upsert({
          auction_id: auctionId,
          buyer_id: buyerId,
          confirmed: true,
          confirmed_at: new Date().toISOString(),
        });

      if (deliveryError) {
        throw new Error(`Delivery confirmation error: ${deliveryError.message}`);
      }

      // Release the escrow hold
      const { error: escrowError } = await supabase
        .from('escrow_holds')
        .update({
          status: 'released',
          buyer_confirmed: true,
          buyer_confirmed_at: new Date().toISOString(),
          release_reason: 'Buyer confirmed delivery',
        })
        .eq('payment_id', payment.id);

      if (escrowError) {
        throw new Error(`Escrow release error: ${escrowError.message}`);
      }

      // Update payment status
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
          payment_step: PAYMENT_STEPS.RELEASED,
          released_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Payment update error: ${updateError.message}`);
      }

      // Create payout
      await this.createPayout({ paymentId: payment.id });

      // Log the step
      await this.logPaymentStep({
        paymentId: payment.id,
        step: 'manual_release',
        status: 'success',
      });

      return updatedPayment;

    } catch (error) {
      console.error('Error confirming delivery and releasing funds:', error);
      throw error;
    }
  }

  /**
   * Process automatic escrow releases (called by scheduled job)
   */
  static async processAutoReleases() {
    try {
      // This function will be called by the database trigger
      // But we can also call it manually for processing
      const { data, error } = await supabase.rpc('process_escrow_releases');
      
      if (error) {
        throw new Error(`Auto-release processing error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error processing auto-releases:', error);
      throw error;
    }
  }

  // ===================== STEP 5: DISPUTE HANDLING =====================
  /**
   * Open a dispute
   */
  static async openDispute({ paymentId, auctionId, openerId, type, reason, description }) {
    try {
      // Get payment details
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*, auctions(*)')
        .eq('id', paymentId)
        .single();

      if (paymentError || !payment) {
        throw new Error('Payment not found');
      }

      // Determine respondent
      const respondentId = openerId === payment.user_id 
        ? payment.auctions.seller_id 
        : payment.user_id;

      // Create dispute
      const { data: dispute, error: disputeError } = await supabase
        .from('disputes')
        .insert({
          payment_id: paymentId,
          auction_id: auctionId,
          opener_id: openerId,
          respondent_id: respondentId,
          type,
          reason,
          description,
          response_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (disputeError) {
        throw new Error(`Dispute creation error: ${disputeError.message}`);
      }

      // Update escrow hold to mark as disputed
      await supabase
        .from('escrow_holds')
        .update({
          dispute_opened: true,
          auto_release: false, // Stop auto-release
        })
        .eq('payment_id', paymentId);

      // Update payment status
      await supabase
        .from('payments')
        .update({
          payment_step: PAYMENT_STEPS.DISPUTED,
        })
        .eq('id', paymentId);

      // Log the step
      await this.logPaymentStep({
        paymentId,
        step: 'dispute_opened',
        status: 'success',
      });

      return dispute;

    } catch (error) {
      console.error('Error opening dispute:', error);
      throw error;
    }
  }

  // ===================== STEP 6: PAYOUT TO SELLER =====================
  /**
   * Create payout to seller
   */
  static async createPayout({ paymentId }) {
    try {
      // Get payment details
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*, auctions(seller_id)')
        .eq('id', paymentId)
        .single();

      if (paymentError || !payment) {
        throw new Error('Payment not found');
      }

      // Get seller's Stripe account
      const { data: sellerAccount, error: accountError } = await supabase
        .from('stripe_accounts')
        .select('*')
        .eq('user_id', payment.auctions.seller_id)
        .single();

      if (accountError || !sellerAccount) {
        throw new Error('Seller Stripe account not found');
      }

      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          payment_id: paymentId,
          seller_id: payment.auctions.seller_id,
          auction_id: payment.auction_id,
          gross_amount: payment.amount,
          platform_fee: payment.platform_fee_amount,
          stripe_fee: payment.stripe_fee_amount,
          net_amount: payment.net_amount,
          scheduled_for: new Date().toISOString(),
          destination_account: sellerAccount.stripe_account_id,
        })
        .select()
        .single();

      if (payoutError) {
        throw new Error(`Payout creation error: ${payoutError.message}`);
      }

      // The actual Stripe transfer happens automatically through Connect
      // when the PaymentIntent was captured with transfer_data

      // Update payment to completed
      await supabase
        .from('payments')
        .update({
          payment_step: PAYMENT_STEPS.COMPLETED,
        })
        .eq('id', paymentId);

      // Log the step
      await this.logPaymentStep({
        paymentId,
        step: 'payout_created',
        status: 'success',
      });

      return payout;

    } catch (error) {
      console.error('Error creating payout:', error);
      throw error;
    }
  }

  // ===================== UTILITY FUNCTIONS =====================
  /**
   * Log payment step for debugging and compliance
   */
  static async logPaymentStep({ paymentId, step, status, stripeEventId = null, stripeResponse = null, errorMessage = null }) {
    try {
      await supabase
        .from('payment_step_logs')
        .insert({
          payment_id: paymentId,
          step,
          status,
          stripe_event_id: stripeEventId,
          stripe_response: stripeResponse,
          error_message: errorMessage,
          processed_by: 'system',
        });
    } catch (error) {
      console.error('Error logging payment step:', error);
      // Don't throw - logging shouldn't break the main flow
    }
  }

  /**
   * Get payment status and step
   */
  static async getPaymentStatus({ paymentId }) {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          escrow_holds(*),
          disputes(*),
          payouts(*)
        `)
        .eq('id', paymentId)
        .single();

      if (error) {
        throw new Error(`Payment not found: ${error.message}`);
      }

      return payment;
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Cancel pre-authorized payment
   */
  static async cancelPreAuthorization({ paymentId }) {
    try {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('payment_step', PAYMENT_STEPS.PRE_AUTHORIZED)
        .single();

      if (paymentError || !payment) {
        throw new Error('Pre-authorized payment not found');
      }

      // Cancel the PaymentIntent
      const paymentIntent = await stripe.paymentIntents.cancel(
        payment.stripe_payment_intent_id
      );

      // Update payment status
      await supabase
        .from('payments')
        .update({
          status: 'canceled',
          payment_step: 'canceled',
        })
        .eq('id', paymentId);

      // Log the step
      await this.logPaymentStep({
        paymentId,
        step: 'canceled',
        status: 'success',
        stripeResponse: paymentIntent,
      });

      return paymentIntent;

    } catch (error) {
      console.error('Error canceling pre-authorization:', error);
      throw error;
    }
  }
}