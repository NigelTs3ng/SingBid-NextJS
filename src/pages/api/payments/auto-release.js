import stripe, { STRIPE_CONFIG, PAYOUT_STATUSES } from '../../../lib/stripe.js';
import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth check for cron jobs (you can enhance this with proper API key auth)
  const authToken = req.headers.authorization?.replace('Bearer ', '');
  if (authToken !== process.env.CRON_SECRET_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();
    let releasedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Find all payouts that are on hold and past their expiry date
    const { data: expiredPayouts, error: payoutsError } = await supabase
      .from('payouts')
      .select(`
        id,
        seller_id,
        auction_id,
        payment_id,
        amount,
        hold_expires_at,
        payments(stripe_payment_intent_id)
      `)
      .eq('status', PAYOUT_STATUSES.ON_HOLD)
      .lt('hold_expires_at', now)
      .limit(50); // Process in batches to avoid timeouts

    if (payoutsError) {
      return res.status(500).json({ 
        error: 'Database query failed',
        details: payoutsError.message 
      });
    }

    console.log(`Found ${expiredPayouts?.length || 0} expired payouts to process`);

    // Process each expired payout
    for (const payout of expiredPayouts || []) {
      try {
        // Get seller's Stripe account
        const { data: seller, error: sellerError } = await supabase
          .from('users')
          .select('stripe_account_id')
          .eq('id', payout.seller_id)
          .single();

        if (sellerError || !seller?.stripe_account_id) {
          throw new Error(`Seller Stripe account not found for payout ${payout.id}`);
        }

        // Calculate transfer amount
        const transferAmount = Math.round(payout.amount * 100); // Convert to cents

        // Create Stripe Transfer to seller's Connect account
        const transfer = await stripe.transfers.create({
          amount: transferAmount,
          currency: STRIPE_CONFIG.currency,
          destination: seller.stripe_account_id,
          transfer_group: `auction_${payout.auction_id}`,
          metadata: {
            auction_id: payout.auction_id,
            payout_id: payout.id,
            release_reason: 'auto_release_expired',
            auto_release: 'true',
          },
        });

        // Update payout status
        const { error: updateError } = await supabase
          .from('payouts')
          .update({
            status: PAYOUT_STATUSES.PAID,
            stripe_transfer_id: transfer.id,
            released_at: now,
            updated_at: now,
          })
          .eq('id', payout.id);

        if (updateError) {
          throw new Error(`Database update failed for payout ${payout.id}: ${updateError.message}`);
        }

        // Create notification for seller
        await supabase
          .from('notifications')
          .insert({
            user_id: payout.seller_id,
            type: 'payout_auto_released',
            title: 'Payment Auto-Released',
            message: `Your payout of $${payout.amount} has been automatically released after the 5-day hold period.`,
            link: `/payment-dashboard`,
          });

        releasedCount++;
        console.log(`Successfully released payout ${payout.id} - $${payout.amount} to ${seller.stripe_account_id}`);

      } catch (error) {
        errorCount++;
        errors.push({
          payoutId: payout.id,
          error: error.message
        });
        console.error(`Error processing payout ${payout.id}:`, error);
      }
    }

    // Log the job results
    console.log(`Auto-release job completed: ${releasedCount} released, ${errorCount} errors`);

    return res.status(200).json({
      success: true,
      processed: expiredPayouts?.length || 0,
      released: releasedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      timestamp: now,
      message: `Auto-release job completed: ${releasedCount} payouts released, ${errorCount} errors`,
    });

  } catch (error) {
    console.error('Auto-release job failed:', error);
    return res.status(500).json({ 
      error: 'Auto-release job failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}