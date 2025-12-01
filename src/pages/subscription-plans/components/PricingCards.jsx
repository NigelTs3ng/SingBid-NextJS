import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const PricingCards = () => {
  const plans = [
    {
      name: 'Standard',
      price: 'Free',
      description: 'Perfect for getting started with auctions',
      features: [
        'Create and bid on auctions',
        'Basic auction customization',
        'Standard customer support',
        '5% platform fee',
        'Basic analytics',
        'Up to 10 active listings'
      ],
      highlighted: false
    },
    {
      name: 'Premium',
      price: '$19.99',
      period: '/month',
      description: 'For serious sellers who want more',
      features: [
        'All Standard features',
        'Reduced 2.5% platform fee',
        'Priority customer support',
        'Advanced auction customization',
        'Detailed analytics dashboard',
        'Unlimited active listings',
        'Featured listings priority'
      ],
      highlighted: true
    }
  ];

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.2 }}
          className={`rounded-2xl p-8 ${
            plan.highlighted
              ? 'bg-primary text-white shadow-xl scale-105'
              : 'bg-white border-2 border-gray-100'
          }`}
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <div className="text-3xl font-bold mb-2">
              {plan.price}
              <span className="text-base font-normal">{plan.period}</span>
            </div>
            <p className="text-sm mb-6 opacity-90">{plan.description}</p>
          </div>
          
          <ul className="space-y-4 mb-8">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <Check className="w-5 h-5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          
          <button
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
              plan.highlighted
                ? 'bg-white text-primary hover:bg-gray-100'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {plan.highlighted ? 'Upgrade Now' : 'Get Started'}
          </button>
        </motion.div>
      ))}
    </div>
  );
};

export default PricingCards;