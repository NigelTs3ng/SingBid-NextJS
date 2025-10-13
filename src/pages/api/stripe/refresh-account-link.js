import stripe from '../../../lib/stripe.js';
import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ 
        error: 'Missing required field: accountId' 
      });
    }

    // Create a new account link for the existing account
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller-onboarding/refresh?account_id=${accountId}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller-onboarding/complete?account_id=${accountId}`,
      type: 'account_onboarding',
      collect: 'eventually_due'
    });

    console.log('✅ Refreshed Stripe Connect account link:', {
      accountId: accountId,
      onboardingUrl: accountLink.url,
      expiresAt: accountLink.expires_at
    });

    return res.status(200).json({
      success: true,
      account: {
        id: accountId,
        onboarding_url: accountLink.url,
        expires_at: accountLink.expires_at
      },
      message: 'Account link refreshed successfully'
    });

  } catch (error) {
    console.error('Error refreshing Stripe Connect account link:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(404).json({ 
        error: 'Stripe account not found',
        message: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}