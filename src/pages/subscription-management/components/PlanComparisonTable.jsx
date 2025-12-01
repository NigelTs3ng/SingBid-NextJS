import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const PlanComparisonTable = ({ currentPlan, onSelectPlan }) => {
  const plans = [
    {
      id: 'standard',
      name: 'Standard',
      price: 'Free',
      priceAmount: 0,
      description: 'Perfect for casual sellers',
      features: [
        { name: 'Create unlimited auctions', included: true },
        { name: 'Basic profile features', included: true },
        { name: 'Standard customer support', included: true },
        { name: '5% platform transaction fees', included: true, highlight: false },
        { name: 'Premium profile badge', included: false },
        { name: 'Priority customer support', included: false },
        { name: 'Enhanced profile visibility', included: false },
        { name: 'Reduced platform fees (2.5%)', included: false }
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$19.99',
      priceAmount: 19.99,
      description: 'Best for active sellers',
      popular: true,
      features: [
        { name: 'Create unlimited auctions', included: true },
        { name: 'Advanced profile features', included: true },
        { name: 'Priority customer support', included: true },
        { name: 'Reduced platform fees (2.5%)', included: true, highlight: true },
        { name: 'Premium profile badge', included: true, highlight: true },
        { name: 'Enhanced profile visibility', included: true, highlight: true },
        { name: 'Early access to new features', included: true, highlight: true },
        { name: 'Advanced analytics dashboard', included: true, highlight: true }
      ]
    }
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground">Compare features and select the plan that works best for you</p>
      </div>
      {/* Mobile View - Cards */}
      <div className="block lg:hidden space-y-4">
        {plans?.map((plan) => (
          <div 
            key={plan?.id}
            className={`border rounded-lg p-4 relative ${
              plan?.popular ? 'border-primary bg-primary/5' : 'border-border'
            } ${currentPlan?.type === plan?.id ? 'ring-2 ring-primary' : ''}`}
          >
            {plan?.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </div>
              </div>
            )}

            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">{plan?.name}</h3>
              <div className="text-2xl font-bold text-foreground mt-2">
                {plan?.price}
                {plan?.priceAmount > 0 && <span className="text-sm font-normal text-muted-foreground">/month</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{plan?.description}</p>
            </div>

            <div className="space-y-2 mb-4">
              {plan?.features?.map((feature, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <Icon 
                    name={feature?.included ? "Check" : "X"} 
                    size={16} 
                    className={`mt-0.5 ${
                      feature?.included 
                        ? feature?.highlight ? 'text-primary' : 'text-success' :'text-muted-foreground'
                    }`}
                  />
                  <span className={`text-sm ${
                    feature?.included 
                      ? feature?.highlight ? 'text-primary font-medium' : 'text-foreground'
                      : 'text-muted-foreground'
                  }`}>
                    {feature?.name}
                  </span>
                </div>
              ))}
            </div>

            <Button
              variant={currentPlan?.type === plan?.id ? "outline" : plan?.popular ? "default" : "secondary"}
              fullWidth
              disabled={currentPlan?.type === plan?.id}
              onClick={() => onSelectPlan(plan)}
            >
              {currentPlan?.type === plan?.id ? 'Current Plan' : `Select ${plan?.name}`}
            </Button>
          </div>
        ))}
      </div>
      {/* Desktop View - Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-4 font-medium text-foreground">Features</th>
              {plans?.map((plan) => (
                <th key={plan?.id} className="text-center py-4 px-4 relative">
                  {plan?.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                        Most Popular
                      </div>
                    </div>
                  )}
                  <div className={`p-4 rounded-lg ${plan?.popular ? 'bg-primary/5 border border-primary' : 'bg-muted/50'}`}>
                    <h3 className="text-lg font-semibold text-foreground">{plan?.name}</h3>
                    <div className="text-2xl font-bold text-foreground mt-2">
                      {plan?.price}
                      {plan?.priceAmount > 0 && <span className="text-sm font-normal text-muted-foreground">/month</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{plan?.description}</p>
                    <Button
                      variant={currentPlan?.type === plan?.id ? "outline" : plan?.popular ? "default" : "secondary"}
                      size="sm"
                      disabled={currentPlan?.type === plan?.id}
                      onClick={() => onSelectPlan(plan)}
                      className="mt-3"
                    >
                      {currentPlan?.type === plan?.id ? 'Current Plan' : `Select ${plan?.name}`}
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans?.[0]?.features?.map((_, featureIndex) => (
              <tr key={featureIndex} className="border-b border-border">
                <td className="py-3 px-4 text-foreground font-medium">
                  {plans?.[0]?.features?.[featureIndex]?.name}
                </td>
                {plans?.map((plan) => (
                  <td key={plan?.id} className="py-3 px-4 text-center">
                    <Icon 
                      name={plan?.features?.[featureIndex]?.included ? "Check" : "X"} 
                      size={20} 
                      className={`mx-auto ${
                        plan?.features?.[featureIndex]?.included 
                          ? plan?.features?.[featureIndex]?.highlight ? 'text-primary' : 'text-success' :'text-muted-foreground'
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlanComparisonTable;