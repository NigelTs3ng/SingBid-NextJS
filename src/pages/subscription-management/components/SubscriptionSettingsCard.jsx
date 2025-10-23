import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const SubscriptionSettingsCard = ({ currentPlan, onCancelSubscription }) => {
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [billingReminders, setBillingReminders] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleSaveSettings = () => {
    console.log('Saving settings:', {
      autoRenewal,
      emailNotifications,
      billingReminders
    });
    // Mock save functionality
  };

  const handleCancelSubscription = () => {
    setShowCancelModal(false);
    onCancelSubscription();
  };

  if (currentPlan?.type === 'standard') {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center py-8">
          <Icon name="Crown" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Upgrade to Premium</h3>
          <p className="text-muted-foreground mb-4">
            Get access to premium features and subscription management options
          </p>
          <Button 
            variant="default"
            iconName="Crown"
            iconPosition="left"
            onClick={() => window.location.href = '#upgrade'}
          >
            Upgrade Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Subscription Settings</h2>
          <p className="text-muted-foreground">Manage your subscription preferences and notifications</p>
        </div>

        <div className="space-y-6">
          {/* Auto-renewal Settings */}
          <div className="border-b border-border pb-6">
            <h3 className="font-medium text-foreground mb-4 flex items-center space-x-2">
              <Icon name="RotateCcw" size={16} />
              <span>Auto-renewal</span>
            </h3>
            <div className="space-y-4">
              <Checkbox
                label="Automatically renew my subscription"
                description="Your subscription will automatically renew at the end of each billing period"
                checked={autoRenewal}
                onChange={(e) => setAutoRenewal(e?.target?.checked)}
              />
              {!autoRenewal && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Icon name="AlertTriangle" size={16} className="text-warning mt-0.5" />
                    <div>
                      <h4 className="font-medium text-warning">Auto-renewal disabled</h4>
                      <p className="text-sm text-warning/80 mt-1">
                        Your subscription will expire on {new Date(currentPlan.endDate)?.toLocaleDateString('en-SG')}. 
                        You'll lose access to premium features unless you renew manually.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="border-b border-border pb-6">
            <h3 className="font-medium text-foreground mb-4 flex items-center space-x-2">
              <Icon name="Bell" size={16} />
              <span>Notifications</span>
            </h3>
            <div className="space-y-4">
              <Checkbox
                label="Email notifications"
                description="Receive updates about your subscription via email"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e?.target?.checked)}
              />
              <Checkbox
                label="Billing reminders"
                description="Get notified before your subscription renews"
                checked={billingReminders}
                onChange={(e) => setBillingReminders(e?.target?.checked)}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="border-b border-border pb-6">
            <h3 className="font-medium text-foreground mb-4 flex items-center space-x-2">
              <Icon name="CreditCard" size={16} />
              <span>Payment Method</span>
            </h3>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">VISA</span>
                </div>
                <div>
                  <div className="font-medium text-foreground">•••• •••• •••• 4242</div>
                  <div className="text-sm text-muted-foreground">Expires 12/26</div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/payment-dashboard'}
              >
                Update
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="font-medium text-error mb-4 flex items-center space-x-2">
              <Icon name="AlertTriangle" size={16} />
              <span>Danger Zone</span>
            </h3>
            <div className="border border-error/20 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-foreground">Cancel Subscription</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cancel your premium subscription. You'll retain access until the end of your billing period.
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-6 border-t border-border">
          <Button 
            variant="default"
            onClick={handleSaveSettings}
            iconName="Save"
            iconPosition="left"
          >
            Save Settings
          </Button>
        </div>
      </div>
      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center">
                <Icon name="AlertTriangle" size={20} className="text-error" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Cancel Subscription</h3>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Are you sure you want to cancel your premium subscription? You'll lose access to premium features 
              at the end of your current billing period on {new Date(currentPlan.endDate)?.toLocaleDateString('en-SG')}.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-foreground mb-2">You'll lose access to:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <Icon name="X" size={14} className="text-error" />
                  <span>Reduced 2.5% platform fees</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Icon name="X" size={14} className="text-error" />
                  <span>Priority customer support</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Icon name="X" size={14} className="text-error" />
                  <span>Premium profile badge</span>
                </li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                fullWidth
                onClick={() => setShowCancelModal(false)}
              >
                Keep Subscription
              </Button>
              <Button 
                variant="destructive" 
                fullWidth
                onClick={handleCancelSubscription}
              >
                Cancel Subscription
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubscriptionSettingsCard;