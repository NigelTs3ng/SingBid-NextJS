import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { auctionId, paymentId, userId } = req.query;

    if (!auctionId && !paymentId && !userId) {
      return res.status(400).json({ 
        error: 'Either auctionId, paymentId, or userId is required' 
      });
    }

    let query = supabase
      .from('payments')
      .select(`
        *,
        payouts(*),
        outcomes(*),
        auctions(title, seller_id),
        disputes(*)
      `);

    if (auctionId) {
      query = query.eq('auction_id', auctionId);
    } else if (paymentId) {
      query = query.eq('id', paymentId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: payments, error } = await query;

    if (error) {
      return res.status(500).json({ 
        error: 'Database query failed',
        details: error.message 
      });
    }

    // Process the payment data to include helpful status information
    const processedPayments = payments.map(payment => {
      const payout = payment.payouts?.[0];
      const outcome = payment.outcomes?.[0];
      const dispute = payment.disputes?.[0];

      // Determine overall status
      let overallStatus = 'pending';
      let nextAction = null;
      let canRelease = false;

      if (payment.status === 'succeeded' && payout) {
        if (payout.status === 'on_hold') {
          overallStatus = 'in_escrow';
          const holdExpiry = new Date(payout.hold_expires_at);
          const now = new Date();
          canRelease = now >= holdExpiry;
          nextAction = canRelease ? 'ready_for_release' : 'waiting_for_hold_period';
        } else if (payout.status === 'paid') {
          overallStatus = 'completed';
        } else if (payout.status === 'failed') {
          overallStatus = 'payout_failed';
        } else if (payout.status === 'canceled') {
          overallStatus = 'canceled';
        }
      } else if (payment.status === 'requires_capture') {
        overallStatus = 'authorized';
        nextAction = 'capture_required';
      } else if (payment.status === 'failed') {
        overallStatus = 'failed';
      } else if (payment.status === 'refunded') {
        overallStatus = 'refunded';
      }

      if (dispute && dispute.status === 'open') {
        overallStatus = 'disputed';
        nextAction = 'dispute_resolution_required';
      }

      return {
        ...payment,
        overallStatus,
        nextAction,
        canRelease,
        timeline: {
          created: payment.created_at,
          captured: outcome?.captured_at,
          holdExpires: payout?.hold_expires_at,
          released: payout?.released_at,
        },
        amounts: {
          total: payment.amount,
          platformFee: payment.platform_fee || payment.application_fee_amount,
          sellerReceives: payout?.amount || (payment.amount - (payment.platform_fee || payment.application_fee_amount || 0))
        }
      };
    });

    return res.status(200).json({
      success: true,
      payments: processedPayments,
      count: processedPayments.length,
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}