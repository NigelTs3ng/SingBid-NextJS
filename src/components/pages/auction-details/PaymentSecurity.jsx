import React from 'react';
import Icon from '../../AppIcon';

const PaymentSecurity = () => {
  const securityFeatures = [
    {
      icon: "Shield",
      title: "Buyer Protection",
      description: "Your payment is protected until you confirm receipt of the item"
    },
    {
      icon: "CreditCard",
      title: "Secure Payments",
      description: "All payments processed through Stripe with bank-level security"
    },
    {
      icon: "Clock",
      title: "5-Day Hold",
      description: "Funds are held for 5 days to ensure transaction completion"
    },
    {
      icon: "AlertTriangle",
      title: "Dispute Resolution",
      description: "Built-in dispute system to resolve any transaction issues"
    }
  ];

  const paymentMethods = [
    { name: "Visa", icon: "CreditCard" },
    { name: "Mastercard", icon: "CreditCard" },
    { name: "PayNow", icon: "Smartphone" },
    { name: "Bank Transfer", icon: "Building" }
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Shield" size={32} className="text-success" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Secure Bidding</h3>
        <p className="text-muted-foreground">
          Your payment information is protected with industry-leading security
        </p>
      </div>
      {/* Security Features */}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground">Protection Features</h4>
        {securityFeatures?.map((feature, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon name={feature?.icon} size={16} className="text-success" />
            </div>
            <div>
              <h5 className="font-medium text-foreground text-sm">{feature?.title}</h5>
              <p className="text-xs text-muted-foreground">{feature?.description}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Payment Methods */}
      <div className="border-t border-border pt-4">
        <h4 className="font-medium text-foreground mb-3">Accepted Payment Methods</h4>
        <div className="grid grid-cols-2 gap-2">
          {paymentMethods?.map((method, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 p-2 bg-muted rounded-lg"
            >
              <Icon name={method?.icon} size={16} className="text-muted-foreground" />
              <span className="text-sm text-foreground">{method?.name}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Platform Fee Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Icon name="Info" size={16} className="text-muted-foreground mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Platform Fee</p>
            <p>A 5% platform fee is deducted from the final sale price. Premium members enjoy reduced fees.</p>
          </div>
        </div>
      </div>
      {/* SSL Certificate */}
      <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
        <Icon name="Lock" size={14} />
        <span>SSL Encrypted • Powered by Stripe</span>
      </div>
    </div>
  );
};

export default PaymentSecurity;