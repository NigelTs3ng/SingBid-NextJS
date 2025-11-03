import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import Button from './ui/Button';
import Icon from './AppIcon';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const StripePaymentForm = ({ onSuccess, onCancel, isOpen }) => {
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Initialize Stripe Elements
  useEffect(() => {
    const initializeStripe = async () => {
      const stripeInstance = await stripePromise;
      setStripe(stripeInstance);

      if (stripeInstance && isOpen) {
        // Create setup intent for saving payment method
        try {
          const response = await fetch('/api/payment-methods', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const { clientSecret } = await response.json();
            setClientSecret(clientSecret);

            // Create elements instance
            const elementsInstance = stripeInstance.elements({
              clientSecret
            });
            setElements(elementsInstance);

            // Create payment element (replaces card element for setup intents)
            const paymentElementInstance = elementsInstance.create('payment', {
              business: {
name: 'BidWin'
              },
              layout: {
                type: 'tabs',
                defaultCollapsed: false
              }
            });

            setCardElement(paymentElementInstance);

            // Mount payment element
            setTimeout(() => {
              const paymentContainer = document.getElementById('payment-element');
              if (paymentContainer && paymentElementInstance) {
                paymentElementInstance.mount('#payment-element');
              }
            }, 100);
          }
        } catch (error) {
          console.error('Error creating setup intent:', error);
          setError('Failed to initialize payment form');
        }
      }
    };

    if (isOpen) {
      initializeStripe();
    }

    return () => {
      // Cleanup
      if (cardElement) {
        cardElement.unmount();
      }
    };
  }, [isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('Stripe not initialized');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required'
      });

      if (error) {
        setError(error.message);
      } else if (setupIntent.status === 'succeeded') {
        // Payment method saved successfully
        onSuccess?.(setupIntent.payment_method.id);
      } else {
        setError(`Setup failed: ${setupIntent.status}`);
      }
    } catch (error) {
      console.error('Payment setup error:', error);
      setError('Payment setup failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-4">
      <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md mx-4 my-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Add Payment Method</h2>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            <Icon name="X" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Payment Information
            </label>
            <div 
              id="payment-element"
              className="border border-border rounded-lg p-3 bg-background"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Icon name="AlertTriangle" size={16} className="text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            </div>
          )}

          <div className="bg-muted/30 border border-border rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={16} className="text-primary mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Test Card Numbers:</p>
                <p>• 4242 4242 4242 4242 (Visa)</p>
                <p>• 5555 5555 5555 4444 (Mastercard)</p>
                <p>• Use any future expiry date and any 3-digit CVC</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              loading={processing}
              disabled={processing || !clientSecret}
              fullWidth
              iconName="CreditCard"
              iconPosition="left"
            >
              {processing ? 'Saving...' : 'Save Payment Method'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StripePaymentForm;