import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/ui/Header';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const SellerOnboardingRefresh = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
    }
  }, [user, router]);

  const handleRefreshOnboarding = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get user's Stripe account ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('stripe_account_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.stripe_account_id) {
        throw new Error('No Stripe account found. Please start the verification process again.');
      }

      // Refresh the account link
      const response = await fetch('/api/stripe/refresh-account-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: userData.stripe_account_id })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to refresh account link');
      }

      // Redirect to the new onboarding URL
      window.location.href = result.account.onboarding_url;

    } catch (err) {
      console.error('Error refreshing onboarding:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestartProcess = () => {
    router.push('/seller-onboarding');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Image
                src="/assets/images/hammerLogo.png"
                alt="SingBid Logo"
                className="w-16 h-16 rounded-lg object-cover"
              />
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              Continue Verification
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your verification session has expired. Let's continue where you left off.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="RefreshCw" size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Verification Link Expired
              </h3>
              <p className="text-muted-foreground text-sm">
                For security reasons, verification links expire after some time. 
                Don't worry - your progress has been saved and we can continue from where you left off.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Icon name="AlertCircle" size={20} className="text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">Error</h4>
                    <p className="text-sm text-red-800 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Icon name="Info" size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">What happens next?</h4>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1">
                    <li>• We'll generate a fresh verification link</li>
                    <li>• You'll continue from where you left off</li>
                    <li>• Any information you've already provided will be saved</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                variant="default"
                fullWidth
                onClick={handleRefreshOnboarding}
                loading={loading}
                disabled={loading}
                iconName="RefreshCw"
                iconPosition="left"
              >
                {loading ? 'Generating new link...' : 'Continue Verification'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Having trouble?
                </p>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleRestartProcess}
                  iconName="RotateCcw"
                  iconPosition="left"
                >
                  Start Over
                </Button>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Need help?{' '}
              <a href="mailto:support@singbid.com" className="text-primary hover:text-primary/80 font-medium">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerOnboardingRefresh;