import stripe from '../../../lib/stripe.js';
import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, country = 'SG', type = 'express' } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, email' 
      });
    }

    // Get user profile information for pre-filling Stripe account
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Failed to get user profile:', profileError);
      return res.status(404).json({ 
        error: 'User profile not found' 
      });
    }

    // Check if user already has a Stripe account
    const { data: existingUser } = await supabase
      .from('users')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();

    if (existingUser?.stripe_account_id) {
      return res.status(400).json({ 
        error: 'User already has a Stripe account',
        accountId: existingUser.stripe_account_id,
        onboardingComplete: existingUser.stripe_onboarding_complete
      });
    }

    // Create Stripe Express account with pre-filled information
    const account = await stripe.accounts.create({
      type: type, // 'express' or 'standard'
      country: country,
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual', // Default to individual for now
      individual: {
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        email: email,
        phone: userProfile.phone_number,
        dob: userProfile.date_of_birth ? {
          day: new Date(userProfile.date_of_birth).getDate(),
          month: new Date(userProfile.date_of_birth).getMonth() + 1,
          year: new Date(userProfile.date_of_birth).getFullYear()
        } : undefined,
        address: userProfile.address_line1 ? {
          line1: userProfile.address_line1,
          line2: userProfile.address_line2 || undefined,
          city: userProfile.address_city,
          state: userProfile.address_state || undefined,
          postal_code: userProfile.address_postal_code,
          country: userProfile.address_country || country
        } : undefined
      },
      business_profile: {
        mcc: '5999', // Miscellaneous retail stores
        url: process.env.NEXT_PUBLIC_APP_URL || 'https://singbid.com',
      },
      metadata: {
        user_id: userId,
        platform: 'singbid',
        created_via: 'seller_onboarding'
      }
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller-onboarding/refresh?account_id=${account.id}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller-onboarding/complete?account_id=${account.id}`,
      type: 'account_onboarding',
      collect: 'eventually_due'
    });

    // Update user record with Stripe account ID
    const { error: updateError } = await supabase
      .from('users')
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_complete: false,
        stripe_onboarding_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update user with Stripe account:', updateError);
      // Continue anyway, we can fix this later
    }

    console.log('✅ Stripe Connect account created:', {
      accountId: account.id,
      userId: userId,
      onboardingUrl: accountLink.url
    });

    return res.status(200).json({
      success: true,
      account: {
        id: account.id,
        onboarding_url: accountLink.url,
        expires_at: accountLink.expires_at
      },
      message: 'Stripe Connect account created successfully'
    });

  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ 
        error: 'Payment method error',
        message: error.message 
      });
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid request to Stripe',
        message: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}