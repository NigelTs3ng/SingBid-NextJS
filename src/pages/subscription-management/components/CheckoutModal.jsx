import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

const CheckoutModal = ({ isOpen, onClose, selectedPlan, onPaymentSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [billingAddress, setBillingAddress] = useState({
    address: '',
    city: '',
    postalCode: '',
    country: 'Singapore'
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleInputChange = (field, value) => {
    setCardDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field, value) => {
    setBillingAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePayment = async () => {
    if (!agreeTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    setProcessing(true);
    
    // Mock payment processing
    setTimeout(() => {
      setProcessing(false);
      onPaymentSuccess();
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Complete Your Purchase</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Icon name="X" size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-foreground mb-3">Order Summary</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-foreground">{selectedPlan?.name} Plan</span>
              <span className="font-medium text-foreground">${selectedPlan?.priceAmount?.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <span>Monthly subscription</span>
              <span>Billed monthly</span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span>Total</span>
                <span>${selectedPlan?.priceAmount?.toFixed(2)} USD</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="font-medium text-foreground mb-4">Payment Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'card', name: 'Credit Card', icon: 'CreditCard' },
                { id: 'paypal', name: 'PayPal', icon: 'Wallet' },
                { id: 'bank', name: 'Bank Transfer', icon: 'Building' }
              ]?.map((method) => (
                <button
                  key={method?.id}
                  onClick={() => setPaymentMethod(method?.id)}
                  className={`p-3 border rounded-lg flex items-center space-x-2 transition-colors ${
                    paymentMethod === method?.id
                      ? 'border-primary bg-primary/5' :'border-border hover:bg-muted/50'
                  }`}
                >
                  <Icon name={method?.icon} size={16} />
                  <span className="text-sm font-medium">{method?.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card Details Form */}
          {paymentMethod === 'card' && (
            <div className="mb-6">
              <h3 className="font-medium text-foreground mb-4">Card Details</h3>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Cardholder Name"
                  type="text"
                  placeholder="John Doe"
                  value={cardDetails?.name}
                  onChange={(e) => handleInputChange('name', e?.target?.value)}
                  required
                />
                <Input
                  label="Card Number"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardDetails?.number}
                  onChange={(e) => handleInputChange('number', e?.target?.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Expiry Date"
                    type="text"
                    placeholder="MM/YY"
                    value={cardDetails?.expiry}
                    onChange={(e) => handleInputChange('expiry', e?.target?.value)}
                    required
                  />
                  <Input
                    label="CVC"
                    type="text"
                    placeholder="123"
                    value={cardDetails?.cvc}
                    onChange={(e) => handleInputChange('cvc', e?.target?.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Billing Address */}
          <div className="mb-6">
            <h3 className="font-medium text-foreground mb-4">Billing Address</h3>
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Address"
                type="text"
                placeholder="123 Orchard Road"
                value={billingAddress?.address}
                onChange={(e) => handleAddressChange('address', e?.target?.value)}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  type="text"
                  placeholder="Singapore"
                  value={billingAddress?.city}
                  onChange={(e) => handleAddressChange('city', e?.target?.value)}
                  required
                />
                <Input
                  label="Postal Code"
                  type="text"
                  placeholder="238864"
                  value={billingAddress?.postalCode}
                  onChange={(e) => handleAddressChange('postalCode', e?.target?.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="mb-6">
            <Checkbox
              label="I agree to the Terms of Service and Privacy Policy"
              description="By checking this box, you agree to our subscription terms and billing policies"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e?.target?.checked)}
              required
            />
          </div>

          {/* Security Notice */}
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <Icon name="Shield" size={16} className="text-success mt-0.5" />
              <div>
                <h4 className="font-medium text-success">Secure Payment</h4>
                <p className="text-sm text-success/80 mt-1">
                  Your payment information is encrypted and processed securely through Stripe.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              fullWidth
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              variant="default" 
              fullWidth
              onClick={handlePayment}
              loading={processing}
              disabled={!agreeTerms}
              iconName="CreditCard"
              iconPosition="left"
            >
              {processing ? 'Processing...' : `Pay $${selectedPlan?.priceAmount?.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;