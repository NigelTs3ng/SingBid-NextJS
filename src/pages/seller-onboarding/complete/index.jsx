import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/ui/Header';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const SellerOnboardingComplete = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    const checkOnboardingStatus = async () => {
      try {
        const { account_id } = router.query;
        
        if (!account_id) {
          setError('No account ID provided');
          setLoading(false);
          return;
        }

        // Check Stripe account status
        const response = await fetch('/api/stripe/check-account-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: account_id })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to check account status');
        }

        // Update user record with onboarding completion status
        const { error: updateError } = await supabase
          .from('users')
          .update({
            stripe_onboarding_complete: result.onboardingComplete,
            stripe_charges_enabled: result.chargesEnabled,
            stripe_payouts_enabled: result.payoutsEnabled,
            stripe_details_submitted: result.detailsSubmitted,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Failed to update user onboarding status:', updateError);
        }

        setVerificationStatus(result);
        setLoading(false);

      } catch (err) {
        console.error('Error checking onboarding status:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (router.isReady && user) {
      checkOnboardingStatus();
    }
  }, [router.isReady, router.query, user]);

  const handleContinue = () => {
    // Redirect based on verification status
    if (verificationStatus?.onboardingComplete) {
      router.push('/create-auction');
    } else {
      router.push('/seller-onboarding/refresh');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verifying your account...</p>
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
              Seller Verification
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Let's check your account status
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            {error ? (
              <div className="space-y-6">
                <div className="text-center">
                  <Icon name="AlertCircle" size={48} className="text-destructive mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-destructive mb-2">Verification Error</h3>
                  <p className="text-muted-foreground">{error}</p>
                </div>
                
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => router.push('/seller-onboarding')}
                  iconName="RefreshCw"
                  iconPosition="left"
                >
                  Try Again
                </Button>
              </div>
            ) : verificationStatus?.onboardingComplete ? (
              <div className="space-y-6">
                <div className="text-center">
                  <Icon name="CheckCircle" size={48} className="text-success mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-success mb-2">Verification Complete!</h3>
                  <p className="text-muted-foreground">
                    Your seller account has been successfully verified. You can now create auctions and receive payments.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Icon name="Shield" size={20} className="text-green-600 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-900">Account Features Enabled</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li className="flex items-center space-x-2">
                          <Icon name="Check" size={14} />
                          <span>Accept payments from buyers</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Icon name="Check" size={14} />
                          <span>Receive automatic payouts</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Icon name="Check" size={14} />
                          <span>Create unlimited auctions</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Icon name="Check" size={14} />
                          <span>Access seller dashboard</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="default"
                    fullWidth
                    onClick={handleContinue}
                    iconName="Plus"
                    iconPosition="left"
                  >
                    Create Your First Auction
                  </Button>
                  
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => router.push('/dashboard')}
                    iconName="BarChart"
                    iconPosition="left"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <Icon name="Clock" size={48} className="text-warning mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-warning mb-2">Verification Pending</h3>
                  <p className="text-muted-foreground">
                    Your account verification is still in progress. This usually takes a few minutes.
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-yellow-900">Verification Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-yellow-800">Details Submitted</span>
                        <Icon 
                          name={verificationStatus?.detailsSubmitted ? "Check" : "X"} 
                          size={16} 
                          className={verificationStatus?.detailsSubmitted ? "text-green-600" : "text-red-600"} 
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-yellow-800">Charges Enabled</span>
                        <Icon 
                          name={verificationStatus?.chargesEnabled ? "Check" : "X"} 
                          size={16} 
                          className={verificationStatus?.chargesEnabled ? "text-green-600" : "text-red-600"} 
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-yellow-800">Payouts Enabled</span>
                        <Icon 
                          name={verificationStatus?.payoutsEnabled ? "Check" : "X"} 
                          size={16} 
                          className={verificationStatus?.payoutsEnabled ? "text-green-600" : "text-red-600"} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="default"
                    fullWidth
                    onClick={() => window.location.reload()}
                    iconName="RefreshCw"
                    iconPosition="left"
                  >
                    Check Status Again
                  </Button>
                  
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={handleContinue}
                    iconName="ExternalLink"
                    iconPosition="left"
                  >
                    Complete Verification
                  </Button>
                </div>
              </div>
            )}
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

export default SellerOnboardingComplete;