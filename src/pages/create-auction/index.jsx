"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { auctionService } from '../../lib/services.js';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// Import components
import AuctionBasicDetails from '../../components/pages/create-auction/AuctionBasicDetails';
import AuctionImageUpload from '../../components/pages/create-auction/AuctionImageUpload';
import AuctionTimingControls from '../../components/pages/create-auction/AuctionTimingControls';
import AuctionAdvancedOptions from '../../components/pages/create-auction/AuctionAdvancedOptions';
import AuctionPreview from '../../components/pages/create-auction/AuctionPreview';
import AuctionSubmission from '../../components/pages/create-auction/AuctionSubmission';

// Seller Verification Prompt Component
const SellerVerificationPrompt = ({ user, onSetupComplete }) => {
  const [loading, setLoading] = useState(false);

  const handleSetupStripeAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          country: 'SG',
          type: 'express'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create Stripe account');
      }

      // Redirect to Stripe onboarding
      window.location.href = result.account.onboarding_url;

    } catch (error) {
      console.error('Error setting up Stripe account:', error);
      alert('Failed to set up seller account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Store" size={32} className="text-warning" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Complete Seller Verification
          </h2>
          <p className="text-muted-foreground">
            To protect buyers and ensure secure payments, we need to verify your identity before you can create auctions.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
            <Icon name="Shield" size={20} className="mr-2" />
            Why do we need verification?
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start space-x-2">
              <Icon name="Check" size={16} className="mt-0.5 flex-shrink-0" />
              <span>Enables secure payment processing for your sales</span>
            </li>
            <li className="flex items-start space-x-2">
              <Icon name="Check" size={16} className="mt-0.5 flex-shrink-0" />
              <span>Builds trust with buyers through identity verification</span>
            </li>
            <li className="flex items-start space-x-2">
              <Icon name="Check" size={16} className="mt-0.5 flex-shrink-0" />
              <span>Ensures compliance with financial regulations</span>
            </li>
            <li className="flex items-start space-x-2">
              <Icon name="Check" size={16} className="mt-0.5 flex-shrink-0" />
              <span>Protects against fraud and unauthorized sales</span>
            </li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-left">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center">
            <Icon name="Zap" size={20} className="mr-2" />
            Quick Setup Process
          </h3>
          <div className="space-y-3 text-sm text-green-800">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <span>We'll pre-fill your information from signup</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <span>Verify your identity with official documents</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <span>Add your bank account for payouts</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
              <span>Start creating auctions immediately!</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            variant="default"
            size="lg"
            fullWidth
            onClick={handleSetupStripeAccount}
            loading={loading}
            disabled={loading}
            iconName="CreditCard"
            iconPosition="left"
          >
            {loading ? 'Setting up your account...' : 'Complete Seller Verification'}
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Verification is powered by Stripe and takes just a few minutes. 
              <br />
              Your information is secure and encrypted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateAuction = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [images, setImages] = useState([]);
  
  // Seller verification states
  const [sellerVerificationStatus, setSellerVerificationStatus] = useState('checking'); // 'checking', 'verified', 'needs_setup', 'pending'
  const [verificationError, setVerificationError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    condition: '',
    reservePrice: '',
    startDate: '',
    startTime: '',
    duration: '',
    shippingMethod: '',
    shippingCost: '',
    itemLocation: '',
    returnPolicy: '',
    returnConditions: '',
    requireVerifiedPhone: false,
    requireMinRating: false,
    minRating: '',
    blockUnpaidBuyers: false,
    additionalRequirements: ''
  });

  const steps = [
    { id: 1, title: 'Basic Details', icon: 'Package' },
    { id: 2, title: 'Images', icon: 'Image' },
    { id: 3, title: 'Timing', icon: 'Clock' },
    { id: 4, title: 'Advanced', icon: 'Settings' },
    { id: 5, title: 'Preview', icon: 'Eye' },
    { id: 6, title: 'Submit', icon: 'Send' }
  ];

  // Check authentication and seller verification
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/signin?redirect=/create-auction');
      return;
    }

    const checkSellerVerification = async () => {
      try {
        // Check if user has Stripe account setup
        const { data: userData, error } = await supabase
          .from('users')
          .select('stripe_account_id, stripe_onboarding_complete')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
          setVerificationError('Failed to check verification status');
          setSellerVerificationStatus('needs_setup');
          return;
        }

        console.log('🔍 Create Auction - User verification status:', {
          userId: user.id,
          stripeAccountId: userData.stripe_account_id,
          onboardingComplete: userData.stripe_onboarding_complete
        });

        // If no Stripe account, needs setup
        if (!userData.stripe_account_id) {
          setSellerVerificationStatus('needs_setup');
          return;
        }

        // If has account but not onboarded, check current status via API
        if (!userData.stripe_onboarding_complete) {
          try {
            const response = await fetch('/api/stripe/check-account-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId: userData.stripe_account_id })
            });

            const result = await response.json();

            if (response.ok && result.onboardingComplete) {
              // Update local status (only update columns that exist)
              await supabase
                .from('users')
                .update({
                  stripe_onboarding_complete: true,
                })
                .eq('id', user.id);

              setSellerVerificationStatus(result.chargesEnabled ? 'verified' : 'pending');
            } else {
              setSellerVerificationStatus('pending');
            }
          } catch (statusError) {
            console.error('Error checking Stripe status:', statusError);
            setSellerVerificationStatus('pending');
          }
        } else {
          // Onboarding complete; check live status from Stripe to decide
          try {
            const response = await fetch('/api/stripe/check-account-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId: userData.stripe_account_id })
            });
            const result = await response.json();
            if (response.ok) {
              setSellerVerificationStatus(result.chargesEnabled ? 'verified' : 'pending');
            } else {
              setSellerVerificationStatus('pending');
            }
          } catch (e) {
            setSellerVerificationStatus('pending');
          }
        }

      } catch (error) {
        console.error('Error in seller verification check:', error);
        setVerificationError('Failed to verify seller status');
        setSellerVerificationStatus('needs_setup');
      }
    };

    if (user?.id) {
      checkSellerVerification();
    }
  }, [isAuthenticated, user, router]);

  const handleFormDataChange = (newData) => {
    setFormData(newData);
    // Clear related errors when data changes
    const updatedErrors = { ...errors };
    Object.keys(newData)?.forEach(key => {
      if (updatedErrors[key]) {
        delete updatedErrors[key];
      }
    });
    setErrors(updatedErrors);
  };

  const handleImagesChange = (newImages) => {
    setImages(newImages);
    if (errors?.images) {
      setErrors(prev => ({ ...prev, images: null }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData?.title?.trim()) newErrors.title = 'Title is required';
        if (!formData?.description?.trim()) newErrors.description = 'Description is required';
        if (!formData?.category) newErrors.category = 'Category is required';
        if (!formData?.condition) newErrors.condition = 'Condition is required';
        if (!formData?.reservePrice || parseFloat(formData?.reservePrice) <= 0) {
          newErrors.reservePrice = 'Valid reserve price is required';
        }
        break;
      case 2:
        if (images?.length === 0) newErrors.images = 'At least one image is required';
        break;
      case 3:
        if (!formData?.startDate) newErrors.startDate = 'Start date is required';
        if (!formData?.startTime) newErrors.startTime = 'Start time is required';
        if (!formData?.duration) newErrors.duration = 'Duration is required';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepClick = (stepId) => {
    // Allow navigation to previous steps or current step
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});
    
    try {
      // Validate all required fields
      if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
        throw new Error('Please complete all required fields');
      }

      // Create auction in Supabase
      const auction = await auctionService.createAuction({
        ...formData,
        images // TODO: Handle image uploads to Supabase Storage
      });

      console.log('Auction created successfully:', auction);
      
      // Navigate to the newly created auction
      router.push(`/auction-details/${auction.id}?success=true`);
      
    } catch (error) {
      console.error('Submission error:', error);
      setErrors({ submit: error.message || 'Failed to create auction. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading if checking authentication or verification
  if (!isAuthenticated || sellerVerificationStatus === 'checking') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Icon name="Loader" size={32} className="animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">
              {!isAuthenticated ? 'Checking authentication...' : 'Verifying seller status...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show seller verification prompt if needed
  if (sellerVerificationStatus === 'needs_setup') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Breadcrumb customItems={[
            { label: 'Home', path: '/home-page' },
            { label: 'Seller Verification', isActive: true }
          ]} />
          <SellerVerificationPrompt 
            user={user} 
            onSetupComplete={() => setSellerVerificationStatus('verified')}
          />
        </div>
      </div>
    );
  }

  // Show pending verification status
  if (sellerVerificationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Breadcrumb customItems={[
            { label: 'Home', path: '/home-page' },
            { label: 'Verification Pending', isActive: true }
          ]} />
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-8 shadow-sm text-center">
              <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Clock" size={32} className="text-warning" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Verification In Progress
              </h2>
              <p className="text-muted-foreground mb-6">
                Your seller verification is being processed. This usually takes a few minutes.
              </p>
              
              <div className="space-y-4">
                <Button
                  variant="default"
                  fullWidth
                  onClick={() => window.location.reload()}
                  iconName="RefreshCw"
                  iconPosition="left"
                >
                  Check Status Again
                </Button>
                
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => router.push('/seller-onboarding/complete')}
                  iconName="ExternalLink"
                  iconPosition="left"
                >
                  Complete Verification
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success message for verified sellers
  const showVerifiedBanner = sellerVerificationStatus === 'verified';

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <AuctionBasicDetails
            formData={formData}
            onFormDataChange={handleFormDataChange}
            errors={errors}
          />
        );
      case 2:
        return (
          <AuctionImageUpload
            images={images}
            onImagesChange={handleImagesChange}
            error={errors?.images}
          />
        );
      case 3:
        return (
          <AuctionTimingControls
            startDate={formData?.startDate}
            startTime={formData?.startTime}
            duration={formData?.duration}
            onStartDateChange={(value) => handleFormDataChange({ ...formData, startDate: value })}
            onStartTimeChange={(value) => handleFormDataChange({ ...formData, startTime: value })}
            onDurationChange={(value) => handleFormDataChange({ ...formData, duration: value })}
            errors={errors}
          />
        );
      case 4:
        return (
          <AuctionAdvancedOptions
            formData={formData}
            onFormDataChange={handleFormDataChange}
            errors={errors}
          />
        );
      case 5:
        return (
          <AuctionPreview
            formData={formData}
            images={images}
          />
        );
      case 6:
        return (
          <AuctionSubmission
            formData={formData}
            images={images}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  const getStepStatus = (stepId) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb customItems={[
          { label: 'Home', path: '/home-page' },
          { label: 'Create Auction', isActive: true }
        ]} />

        {/* Verified Seller Banner */}
        {showVerifiedBanner && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Icon name="CheckCircle" size={20} className="text-success" />
              <div>
                <p className="font-medium text-success">Seller Account Verified ✓</p>
                <p className="text-sm text-success/80">You're all set to create auctions and receive payments.</p>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create New Auction</h1>
          <p className="text-muted-foreground">
            List your item and start earning. Complete all steps to publish your auction.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {steps?.map((step, index) => {
              const status = getStepStatus(step?.id);
              const isClickable = step?.id <= currentStep;
              
              return (
                <div key={step?.id} className="flex items-center">
                  <button
                    onClick={() => isClickable && handleStepClick(step?.id)}
                    disabled={!isClickable}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                    } ${
                      status === 'completed'
                        ? 'bg-success text-success-foreground singbid-shadow'
                        : status === 'current'
                        ? 'bg-primary text-primary-foreground singbid-shadow'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {status === 'completed' ? (
                        <Icon name="Check" size={20} />
                      ) : (
                        <Icon name={step?.icon} size={20} />
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-sm font-medium">{step?.title}</div>
                    </div>
                  </button>
                  
                  {index < steps?.length - 1 && (
                    <div className="hidden md:block w-8 h-px bg-border mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                iconName="ChevronLeft"
                iconPosition="left"
              >
                Previous
              </Button>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {steps?.length}
            </p>
          </div>
          
          <div>
            {currentStep < steps?.length && (
              <Button
                onClick={handleNext}
                iconName="ChevronRight"
                iconPosition="right"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAuction;