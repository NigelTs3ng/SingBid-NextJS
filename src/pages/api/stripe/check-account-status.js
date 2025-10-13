import stripe from '../../../lib/stripe.js';

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

    // Retrieve Stripe account details
    const account = await stripe.accounts.retrieve(accountId);

    // Check various account capabilities and requirements
    const onboardingComplete = account.details_submitted && 
                              account.charges_enabled && 
                              account.payouts_enabled;

    // Check if there are any requirements that need to be fulfilled
    const hasRequirements = account.requirements?.currently_due?.length > 0 ||
                           account.requirements?.eventually_due?.length > 0 ||
                           account.requirements?.past_due?.length > 0;

    return res.status(200).json({
      success: true,
      accountId: account.id,
      onboardingComplete: onboardingComplete,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      hasRequirements: hasRequirements,
      requirements: {
        currently_due: account.requirements?.currently_due || [],
        eventually_due: account.requirements?.eventually_due || [],
        past_due: account.requirements?.past_due || []
      },
      capabilities: {
        card_payments: account.capabilities?.card_payments,
        transfers: account.capabilities?.transfers
      },
      business_type: account.business_type,
      country: account.country,
      default_currency: account.default_currency,
      created: account.created
    });

  } catch (error) {
    console.error('Error checking Stripe account status:', error);
    
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