import stripe from '../../../lib/stripe.js';
import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all unprocessed outbid cleanups
    const { data: cleanups, error: cleanupError } = await supabase
      .from('outbid_cleanups')
      .select(`
        *,
        bid_pre_authorizations(*)
      `)
      .is('processed_at', null)
      .lt('retry_count', 3) // Don't retry more than 3 times
      .order('created_at', { ascending: true })
      .limit(50); // Process in batches

    if (cleanupError) {
      console.error('Failed to fetch cleanups:', cleanupError);
      return res.status(500).json({ 
        error: 'Failed to fetch cleanup records',
        details: cleanupError.message 
      });
    }

    if (!cleanups || cleanups.length === 0) {
      return res.status(200).json({
        success: true,
        processed: 0,
        message: 'No cleanups to process'
      });
    }

    console.log(`Processing ${cleanups.length} outbid cleanups...`);

    let processedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const cleanup of cleanups) {
      try {
        let stripeResult = null;
        let error = null;

        // Cancel the Stripe PaymentIntent if it exists and hasn't been canceled yet
        if (cleanup.bid_pre_authorizations?.stripe_payment_intent_id && !cleanup.stripe_canceled) {
          try {
            stripeResult = await stripe.paymentIntents.cancel(
              cleanup.bid_pre_authorizations.stripe_payment_intent_id
            );
            
            console.log(`✅ Canceled PaymentIntent: ${cleanup.bid_pre_authorizations.stripe_payment_intent_id}`);
          } catch (stripeError) {
            console.error(`❌ Failed to cancel PaymentIntent: ${stripeError.message}`);
            error = stripeError.message;
          }
        }

        // Update the cleanup record
        const { error: updateError } = await supabase
          .from('outbid_cleanups')
          .update({
            processed_at: new Date().toISOString(),
            stripe_canceled: !!stripeResult,
            stripe_cancel_error: error,
            retry_count: cleanup.retry_count + 1,
          })
          .eq('id', cleanup.id);

        if (updateError) {
          console.error(`Failed to update cleanup record ${cleanup.id}:`, updateError);
          errorCount++;
        } else {
          processedCount++;
          results.push({
            cleanupId: cleanup.id,
            auctionId: cleanup.auction_id,
            outbidBidderId: cleanup.outbid_bidder_id,
            paymentIntentId: cleanup.bid_pre_authorizations?.stripe_payment_intent_id,
            canceled: !!stripeResult,
            error: error
          });
        }

      } catch (processingError) {
        console.error(`Error processing cleanup ${cleanup.id}:`, processingError);
        
        // Update retry count and schedule next retry
        await supabase
          .from('outbid_cleanups')
          .update({
            retry_count: cleanup.retry_count + 1,
            next_retry_at: new Date(Date.now() + (cleanup.retry_count + 1) * 60 * 1000).toISOString(), // Exponential backoff
            stripe_cancel_error: processingError.message,
          })
          .eq('id', cleanup.id);

        errorCount++;
      }
    }

    console.log(`✅ Processed ${processedCount} cleanups, ${errorCount} errors`);

    return res.status(200).json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: cleanups.length,
      results: results,
      message: `Successfully processed ${processedCount} outbid cleanups`
    });

  } catch (error) {
    console.error('Error in cleanup process:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}