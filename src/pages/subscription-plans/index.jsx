import React from 'react';
import PricingCards from './components/PricingCards';
import { motion } from 'framer-motion';

const SubscriptionPlans = () => {
  return (
    <div className="container mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600">
          Select the perfect plan for your auction needs
        </p>
      </motion.div>
      <PricingCards />
    </div>
  );
};

export default SubscriptionPlans;