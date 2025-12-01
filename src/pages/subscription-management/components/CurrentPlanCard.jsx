import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CurrentPlanCard = ({ currentPlan, onUpgrade, onManage }) => {
  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-SG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining(currentPlan?.endDate);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-xl font-semibold text-foreground">Current Plan</h2>
            {currentPlan?.type === 'premium' && (
              <div className="flex items-center space-x-1 bg-accent/10 text-accent px-2 py-1 rounded-full">
                <Icon name="Crown" size={14} />
                <span className="text-xs font-medium">Premium</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground">Manage your subscription and billing</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">
            {currentPlan?.type === 'premium' ? '$19.99' : 'Free'}
          </div>
          {currentPlan?.type === 'premium' && (
            <div className="text-sm text-muted-foreground">per month</div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Calendar" size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Plan Status</span>
          </div>
          <div className="text-lg font-semibold text-foreground capitalize">
            {currentPlan?.status}
          </div>
        </div>

        {currentPlan?.type === 'premium' && (
          <>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Icon name="Clock" size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Next Billing</span>
              </div>
              <div className="text-lg font-semibold text-foreground">
                {formatDate(currentPlan?.endDate)}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Icon name="Timer" size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Days Remaining</span>
              </div>
              <div className="text-lg font-semibold text-foreground">
                {daysRemaining} days
              </div>
            </div>
          </>
        )}

        {currentPlan?.type === 'standard' && (
          <div className="bg-muted/50 rounded-lg p-4 md:col-span-2">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="Info" size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Plan Benefits</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Standard platform features with 5% transaction fees
            </div>
          </div>
        )}
      </div>
      {currentPlan?.type === 'premium' && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-success mb-2 flex items-center space-x-2">
            <Icon name="CheckCircle" size={16} />
            <span>Active Premium Benefits</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center space-x-2 text-success">
              <Icon name="Check" size={14} />
              <span>Reduced 2.5% platform fees</span>
            </div>
            <div className="flex items-center space-x-2 text-success">
              <Icon name="Check" size={14} />
              <span>Priority customer support</span>
            </div>
            <div className="flex items-center space-x-2 text-success">
              <Icon name="Check" size={14} />
              <span>Premium profile badge</span>
            </div>
            <div className="flex items-center space-x-2 text-success">
              <Icon name="Check" size={14} />
              <span>Enhanced profile visibility</span>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        {currentPlan?.type === 'standard' ? (
          <Button 
            variant="default" 
            onClick={onUpgrade}
            iconName="Crown"
            iconPosition="left"
            className="flex-1"
          >
            Upgrade to Premium
          </Button>
        ) : (
          <>
            <Button 
              variant="outline" 
              onClick={onManage}
              iconName="Settings"
              iconPosition="left"
              className="flex-1"
            >
              Manage Subscription
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => window.location.href = '/payment-dashboard'}
              iconName="CreditCard"
              iconPosition="left"
              className="flex-1"
            >
              View Billing
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CurrentPlanCard;