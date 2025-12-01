import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TrustSignalsSection = () => {
  const trustFeatures = [
    {
      icon: "Shield",
      title: "Singapore Registered Business",
      description: "Licensed and regulated by ACRA with full business registration",
      badge: "ACRA Registered",
      color: "text-success"
    },
    {
      icon: "CreditCard",
      title: "Secure Payment Processing",
      description: "Stripe-powered payments with buyer protection and escrow services",
      badge: "Stripe Verified",
      color: "text-primary"
    },
    {
      icon: "Users",
      title: "Verified Seller Network",
      description: "All sellers undergo identity verification and background checks",
      badge: "KYC Verified",
      color: "text-warning"
    },
    {
      icon: "Lock",
      title: "Dispute Resolution",
      description: "Professional mediation service for transaction disputes",
      badge: "Protected",
      color: "text-error"
    }
  ];

  const paymentMethods = [
    {
      name: "Visa",
      icon: "CreditCard",
      description: "All major credit cards accepted"
    },
    {
      name: "PayNow",
      icon: "Smartphone",
      description: "Instant Singapore bank transfers"
    },
    {
      name: "Bank Transfer",
      icon: "Building",
      description: "Direct bank account transfers"
    },
    {
      name: "Digital Wallet",
      icon: "Wallet",
      description: "GrabPay, Apple Pay, Google Pay"
    }
  ];

  const securityStats = [
    {
      value: "99.9%",
      label: "Transaction Success Rate",
      icon: "CheckCircle"
    },
    {
      value: "24/7",
      label: "Fraud Monitoring",
      icon: "Eye"
    },
    {
      value: "$50M+",
      label: "Safely Processed",
      icon: "DollarSign"
    },
    {
      value: "15,000+",
      label: "Verified Users",
      icon: "Users"
    }
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 mb-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-sm mb-4">
          <Icon name="Shield" size={16} className="mr-2" />
          Trusted by Singapore
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Your Security is Our Priority
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Trade with confidence on Singapore's most trusted auction platform. 
          Every transaction is protected by enterprise-grade security.
        </p>
      </div>
      {/* Trust Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {trustFeatures?.map((feature, index) => (
          <div key={index} className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300">
            <div className={`w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4`}>
              <Icon name={feature?.icon} size={24} className={feature?.color} />
            </div>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
              feature?.color === 'text-success' ? 'bg-success/10 text-success' :
              feature?.color === 'text-primary' ? 'bg-primary/10 text-primary' :
              feature?.color === 'text-warning'? 'bg-warning/10 text-warning' : 'bg-error/10 text-error'
            }`}>
              {feature?.badge}
            </div>
            <h3 className="font-semibold text-foreground mb-2">{feature?.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature?.description}
            </p>
          </div>
        ))}
      </div>
      {/* Payment Methods */}
      <div className="bg-white rounded-xl p-8 mb-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Multiple Payment Options
          </h3>
          <p className="text-muted-foreground">
            Choose from various secure payment methods accepted in Singapore
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {paymentMethods?.map((method, index) => (
            <div key={index} className="text-center group">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors duration-200">
                <Icon name={method?.icon} size={24} className="text-muted-foreground group-hover:text-primary transition-colors duration-200" />
              </div>
              <h4 className="font-medium text-foreground mb-1">{method?.name}</h4>
              <p className="text-xs text-muted-foreground">{method?.description}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Security Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {securityStats?.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon name={stat?.icon} size={20} className="text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">{stat?.value}</div>
            <div className="text-sm text-muted-foreground">{stat?.label}</div>
          </div>
        ))}
      </div>
      {/* Singapore Compliance */}
      <div className="bg-white rounded-xl p-8 text-center">
        <div className="flex items-center justify-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Icon name="Flag" size={24} className="text-red-600" />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-bold text-foreground">Singapore Compliant</h3>
            <p className="text-muted-foreground">Fully licensed and regulated platform</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex items-center space-x-3">
            <Icon name="CheckCircle" size={20} className="text-success" />
            <span className="text-sm text-foreground">ACRA Business License</span>
          </div>
          <div className="flex items-center space-x-3">
            <Icon name="CheckCircle" size={20} className="text-success" />
            <span className="text-sm text-foreground">MAS Payment License</span>
          </div>
          <div className="flex items-center space-x-3">
            <Icon name="CheckCircle" size={20} className="text-success" />
            <span className="text-sm text-foreground">PDPA Compliant</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <Button
            variant="outline"
            size="sm"
            iconName="FileText"
            iconPosition="left"
          >
            View Licenses
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconName="HelpCircle"
            iconPosition="left"
          >
            Security FAQ
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconName="Phone"
            iconPosition="left"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrustSignalsSection;