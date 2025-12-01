import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Icon from '../../components/AppIcon';
import CurrentPlanCard from './components/CurrentPlanCard';
import PlanComparisonTable from './components/PlanComparisonTable';
import BillingHistoryCard from './components/BillingHistoryCard';
import SubscriptionSettingsCard from './components/SubscriptionSettingsCard';
import CheckoutModal from './components/CheckoutModal';

const SubscriptionManagement = () => {
  const [currentPlan, setCurrentPlan] = useState({
    type: 'standard',
    status: 'active',
    startDate: new Date().toISOString().split('T')[0],
    endDate: null
  });
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/user/subscription');
      const data = await res.json();
      if (res.ok) {
        setCurrentPlan({
          type: data.plan_type || 'standard',
          status: data.status || 'active',
          startDate: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          endDate: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : null
        });
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check for success message from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams?.get('success') === 'true') {
      setShowSuccessMessage(true);
      // Clean up URL
      window.history?.replaceState({}, document.title, window.location?.pathname);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, []);

  const handlePlanSelection = (plan) => {
    if (plan?.id === currentPlan?.type) return;
    
    setSelectedPlan(plan);
    if (plan?.id === 'premium') {
      setShowCheckoutModal(true);
    } else {
      // Handle downgrade
      handlePlanChange(plan);
    }
  };

  const handlePlanChange = async (plan) => {
    try {
      const res = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: plan?.id, action: 'upgrade' })
      });
      if (res.ok) {
        setCurrentPlan(prev => ({
          ...prev,
          type: plan?.id
        }));
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      }
    } catch (error) {
      console.error('Failed to update plan:', error);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      const res = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: 'premium', action: 'upgrade' })
      });
      if (res.ok) {
        setCurrentPlan(prev => ({
          ...prev,
          type: 'premium',
          status: 'active',
          startDate: new Date()?.toISOString()?.split('T')?.[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)?.toISOString()?.split('T')?.[0]
        }));
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      }
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const res = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: currentPlan.type, action: 'cancel' })
      });
      if (res.ok) {
        setCurrentPlan(prev => ({
          ...prev,
          status: 'cancelled'
        }));
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
  };

  const handleUpgrade = () => {
    const premiumPlan = {
      id: 'premium',
      name: 'Premium',
      price: '$19.99',
      priceAmount: 19.99
    };
    handlePlanSelection(premiumPlan);
  };

  const handleManageSubscription = () => {
    // Scroll to settings section
    document.getElementById('subscription-settings')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-medium text-foreground">Loading subscription...</h2>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Breadcrumb />
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Crown" size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Subscription Management</h1>
              <p className="text-muted-foreground">Manage your premium subscription and billing preferences</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6 animate-fade-in">
            <div className="flex items-center space-x-2">
              <Icon name="CheckCircle" size={20} className="text-success" />
              <span className="font-medium text-success">
                {currentPlan?.status === 'cancelled' ?'Subscription cancelled successfully' :'Subscription updated successfully'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Current Plan */}
            <CurrentPlanCard 
              currentPlan={currentPlan}
              onUpgrade={handleUpgrade}
              onManage={handleManageSubscription}
            />

            {/* Plan Comparison */}
            <PlanComparisonTable 
              currentPlan={currentPlan}
              onSelectPlan={handlePlanSelection}
            />

            {/* Billing History */}
            <BillingHistoryCard />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-4">Account Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan Type</span>
                  <span className="font-medium text-foreground capitalize">{currentPlan?.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-medium capitalize ${
                    currentPlan?.status === 'active' ? 'text-success' : 
                    currentPlan?.status === 'cancelled' ? 'text-error' : 'text-warning'
                  }`}>
                    {currentPlan?.status}
                  </span>
                </div>
                {currentPlan?.type === 'premium' && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Monthly Savings</span>
                    <span className="font-medium text-success">~$15.00</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => window.location.href = '/payment-dashboard'}
                  className="w-full flex items-center space-x-3 p-3 text-left hover:bg-muted rounded-lg transition-colors"
                >
                  <Icon name="CreditCard" size={16} className="text-muted-foreground" />
                  <span className="text-foreground">Payment Methods</span>
                </button>
                <button 
                  onClick={() => window.location.href = '/help'}
                  className="w-full flex items-center space-x-3 p-3 text-left hover:bg-muted rounded-lg transition-colors"
                >
                  <Icon name="HelpCircle" size={16} className="text-muted-foreground" />
                  <span className="text-foreground">Help & Support</span>
                </button>
                <button 
                  onClick={() => window.location.href = '/profile'}
                  className="w-full flex items-center space-x-3 p-3 text-left hover:bg-muted rounded-lg transition-colors"
                >
                  <Icon name="User" size={16} className="text-muted-foreground" />
                  <span className="text-foreground">Profile Settings</span>
                </button>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-3">
                <Icon name="MessageCircle" size={20} className="text-primary" />
                <h3 className="font-semibold text-primary">Need Help?</h3>
              </div>
              <p className="text-sm text-primary/80 mb-4">
                Have questions about your subscription? Our support team is here to help.
              </p>
              <button 
                onClick={() => window.location.href = '/help'}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Settings */}
        <div id="subscription-settings" className="mt-8">
          <SubscriptionSettingsCard 
            currentPlan={currentPlan}
            onCancelSubscription={handleCancelSubscription}
          />
        </div>
      </main>
      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        selectedPlan={selectedPlan}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default SubscriptionManagement;