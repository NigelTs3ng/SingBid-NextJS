import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

interface StripeConnectStatus {
  isConnected: boolean;
  isComplete: boolean;
  accountId?: string;
  account?: {
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    requirements?: any;
  };
  error?: string;
}

export default function StripeConnectPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { success, refresh } = router.query;

  useEffect(() => {
    if (!loading && (!user || userProfile?.user_role !== 'seller')) {
      router.push('/auth/login');
      return;
    }

    if (user && userProfile?.user_role === 'seller') {
      checkStripeStatus();
    }
  }, [user, userProfile, loading, router]);

  useEffect(() => {
    // Handle return from Stripe onboarding
    if (success === 'true') {
      // Refresh status after successful onboarding
      setTimeout(() => {
        checkStripeStatus();
      }, 1000);
    }
  }, [success]);

  const checkStripeStatus = async () => {
    try {
      setStatusLoading(true);
      const response = await fetch('/api/stripe-connect');
      const data = await response.json();

      if (response.ok) {
        setConnectStatus(data);
      } else {
        setError(data.error || 'Failed to check Stripe status');
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      setError('Network error occurred');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleStartOnboarding = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const response = await fetch('/api/stripe-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl;
      } else {
        setError(data.error || 'Failed to start onboarding');
      }
    } catch (error) {
      console.error('Error starting Stripe onboarding:', error);
      setError('Network error occurred');
    } finally {
      setIsConnecting(false);
    }
  };

  if (loading || statusLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-medium text-foreground">Loading...</h2>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Connect Your Bank Account
          </h1>
          <p className="text-muted-foreground">
            Connect your bank account to receive payments from your auction sales
          </p>
        </div>

        {success === 'true' && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="CheckCircle" size={20} className="text-success" />
              <p className="text-success font-medium">
                Stripe onboarding completed! Checking account status...
              </p>
            </div>
          </div>
        )}

        {refresh === 'true' && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="AlertTriangle" size={20} className="text-warning" />
              <p className="text-warning font-medium">
                Please complete all required information to start receiving payments.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={20} className="text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-8">
          
          {/* Current Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Account Status</h2>
            
            {connectStatus ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    connectStatus.isConnected 
                      ? connectStatus.isComplete 
                        ? 'bg-success' 
                        : 'bg-warning'
                      : 'bg-muted'
                  }`} />
                  <span className="font-medium">
                    {connectStatus.isConnected 
                      ? connectStatus.isComplete 
                        ? 'Connected & Ready' 
                        : 'Connected - Setup Required'
                      : 'Not Connected'
                    }
                  </span>
                </div>

                {connectStatus.isConnected && connectStatus.account && (
                  <div className="ml-7 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Icon 
                        name={connectStatus.account.charges_enabled ? "Check" : "X"} 
                        size={16} 
                        className={connectStatus.account.charges_enabled ? "text-success" : "text-muted-foreground"}
                      />
                      <span>Charges enabled: {connectStatus.account.charges_enabled ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Icon 
                        name={connectStatus.account.payouts_enabled ? "Check" : "X"} 
                        size={16} 
                        className={connectStatus.account.payouts_enabled ? "text-success" : "text-muted-foreground"}
                      />
                      <span>Payouts enabled: {connectStatus.account.payouts_enabled ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Icon 
                        name={connectStatus.account.details_submitted ? "Check" : "X"} 
                        size={16} 
                        className={connectStatus.account.details_submitted ? "text-success" : "text-muted-foreground"}
                      />
                      <span>Details submitted: {connectStatus.account.details_submitted ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">Loading status...</div>
            )}
          </div>

          {/* Benefits Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Why Connect Your Bank Account?</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Icon name="CreditCard" size={20} className="text-primary mt-1" />
                <div>
                  <h4 className="font-medium text-foreground">Secure Payments</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive payments directly to your bank account with bank-level security
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon name="Zap" size={20} className="text-primary mt-1" />
                <div>
                  <h4 className="font-medium text-foreground">Fast Transfers</h4>
                  <p className="text-sm text-muted-foreground">
                    Get paid within 2-7 business days after auction completion
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon name="Shield" size={20} className="text-primary mt-1" />
                <div>
                  <h4 className="font-medium text-foreground">Buyer Protection</h4>
                  <p className="text-sm text-muted-foreground">
                    Funds are held until buyer confirms receipt of item
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon name="BarChart3" size={20} className="text-primary mt-1" />
                <div>
                  <h4 className="font-medium text-foreground">Sales Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    Track all your earnings and payouts in one place
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center">
            {connectStatus?.isComplete ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 text-success">
                  <Icon name="CheckCircle" size={24} />
                  <span className="text-lg font-medium">Your account is ready to receive payments!</span>
                </div>
                <Button 
                  onClick={() => router.push('/dashboard/seller')}
                  variant="outline"
                >
                  Back to Dashboard
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleStartOnboarding}
                  loading={isConnecting}
                  disabled={isConnecting}
                  size="lg"
                  iconName="ExternalLink"
                  iconPosition="right"
                >
                  {connectStatus?.isConnected ? 'Complete Setup' : 'Connect Bank Account'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  You'll be redirected to Stripe to securely connect your bank account
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}