import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Icon from './AppIcon';
import StripePaymentForm from './StripePaymentForm';

const PaymentMethods = ({ onPaymentMethodSelected, selectedPaymentMethod }) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState(false);
  const [showStripeForm, setShowStripeForm] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payment-methods');
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
        
        // Auto-select first payment method if available
        if (data.paymentMethods && data.paymentMethods.length > 0 && !selectedPaymentMethod) {
          onPaymentMethodSelected?.(data.paymentMethods[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = () => {
    setShowStripeForm(true);
  };

  const handleStripeSuccess = async (paymentMethodId) => {
    console.log('Payment method saved:', paymentMethodId);
    setShowStripeForm(false);
    
    // Refresh payment methods
    await fetchPaymentMethods();
    
    // Auto-select the newly added payment method
    onPaymentMethodSelected?.(paymentMethodId);
  };

  const handleStripeCancel = () => {
    setShowStripeForm(false);
  };

  const formatCardNumber = (number) => {
    if (!number) return '•••• •••• •••• ••••';
    return `•••• •••• •••• ${number}`;
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Payment Method</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingCard(!addingCard)}
          iconName="Plus"
          iconPosition="left"
        >
          Add Card
        </Button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="text-center py-6">
          <Icon name="CreditCard" size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground mb-4">No payment methods added</p>
          <Button
            variant="outline"
            onClick={handleAddCard}
            iconName="Plus"
            iconPosition="left"
          >
            Add Your First Card
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedPaymentMethod === method.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
              onClick={() => onPaymentMethodSelected?.(method.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon name="CreditCard" size={16} className="text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      {formatCardNumber(method.card?.last4)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {method.card?.brand?.toUpperCase()} expires {method.card?.exp_month}/{method.card?.exp_year}
                    </div>
                  </div>
                </div>
                {selectedPaymentMethod === method.id && (
                  <Icon name="Check" size={16} className="text-primary" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stripe Payment Form Modal */}
      <StripePaymentForm
        isOpen={showStripeForm}
        onSuccess={handleStripeSuccess}
        onCancel={handleStripeCancel}
      />

      {paymentMethods.length > 0 && !selectedPaymentMethod && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Icon name="AlertTriangle" size={16} className="text-warning" />
            <span className="text-sm text-warning font-medium">
              Please select a payment method to place bids
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethods;