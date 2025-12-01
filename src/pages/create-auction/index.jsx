"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import RoleProtectedRoute from '../../components/auth/RoleProtectedRoute';
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

const CreateAuction = () => {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [images, setImages] = useState([]);

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

  const handleFormDataChange = (newData) => {
    setFormData(newData);
    // Clear related errors when data changes
    const updatedErrors = { ...errors };
    Object.keys(newData)?.forEach(key => {
      if (updatedErrors?.[key]) {
        delete updatedErrors?.[key];
      }
    });
    setErrors(updatedErrors);
  };

  const handleImagesChange = (newImages) => {
    setImages(newImages);
    if (newImages?.length > 0 && errors?.images) {
      const updatedErrors = { ...errors };
      delete updatedErrors?.images;
      setErrors(updatedErrors);
    }
  };

  const validateStep = (step) => {
    const stepErrors = {};

    switch (step) {
      case 1:
        if (!formData?.title?.trim()) stepErrors.title = 'Title is required';
        if (!formData?.description?.trim()) stepErrors.description = 'Description is required';
        if (!formData?.category) stepErrors.category = 'Category is required';
        if (!formData?.condition) stepErrors.condition = 'Condition is required';
        if (!formData?.reservePrice || parseFloat(formData?.reservePrice) <= 0) {
          stepErrors.reservePrice = 'Valid reserve price is required';
        }
        break;
      case 2:
        if (images?.length === 0) stepErrors.images = 'At least one image is required';
        break;
      case 3:
        if (!formData?.startDate) stepErrors.startDate = 'Start date is required';
        if (!formData?.startTime) stepErrors.startTime = 'Start time is required';
        if (!formData?.duration) stepErrors.duration = 'Duration is required';
        break;
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors)?.length === 0;
  };

  const handleNextStep = () => {
    if (currentStep < 4 && !validateStep(currentStep)) {
      return;
    }
    
    if (currentStep < steps?.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
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
    
    try {
      // Validate all steps before submission
      for (let step = 1; step <= 4; step++) {
        if (!validateStep(step)) {
          setCurrentStep(step);
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare auction data
      const auctionData = {
        title: formData.title,
        description: formData.description,
        category_id: formData.category, // Assuming category contains the UUID
        condition: formData.condition,
        starting_price: parseFloat(formData.reservePrice),
        reserve_price: parseFloat(formData.reservePrice),
        start_time: new Date(`${formData.startDate}T${formData.startTime}`).toISOString(),
        end_time: new Date(new Date(`${formData.startDate}T${formData.startTime}`).getTime() + 
          parseInt(formData.duration) * 24 * 60 * 60 * 1000).toISOString(),
        seller_id: user?.id, // Use actual authenticated user ID
        location: formData.itemLocation,
        shipping_cost: parseFloat(formData.shippingCost) || 0,
        shipping_methods: [formData.shippingMethod],
        return_policy: formData.returnPolicy,
        return_conditions: formData.returnConditions,
        require_verified_phone: formData.requireVerifiedPhone,
        require_min_rating: formData.requireMinRating,
        min_rating: parseFloat(formData.minRating) || 0,
        block_unpaid_buyers: formData.blockUnpaidBuyers,
        additional_requirements: formData.additionalRequirements,
        status: 'active', // or 'draft' if you want to allow draft auctions
        images: images.filter(img => !img.error && !img.uploading) // Only include successfully uploaded images
      };

      // Create auction with images
      // Get auth token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if session exists
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/auctions', {
        method: 'POST',
        headers,
        credentials: 'include', // This ensures cookies are sent
        body: JSON.stringify(auctionData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create auction');
      }

      console.log('Auction created successfully:', result);
      
      // Navigate to success page or auction listings
      router.push('/auction-listings?success=true');
    } catch (error) {
      console.error('Submission error:', error);
      setErrors({ submit: error.message || 'Failed to create auction. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <RoleProtectedRoute allowedRoles={['seller']}>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb customItems={[
          { label: 'Home', path: '/home-page' },
          { label: 'Create Auction', isActive: true }
        ]} />

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create New Auction</h1>
          <p className="text-muted-foreground">
            List your item for auction and reach thousands of potential buyers in Singapore
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Step Navigation - Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-4 sticky top-24">
              <h3 className="font-semibold text-foreground mb-4">Progress</h3>
              <div className="space-y-3">
                {steps?.map((step, index) => {
                  const status = getStepStatus(step?.id);
                  return (
                    <button
                      key={step?.id}
                      onClick={() => handleStepClick(step?.id)}
                      disabled={step?.id > currentStep}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-200 ${
                        status === 'current' ?'bg-primary text-primary-foreground'
                          : status === 'completed' ?'bg-success/10 text-success hover:bg-success/20' :'text-muted-foreground hover:bg-muted'
                      } ${step?.id > currentStep ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        status === 'current' ?'bg-primary-foreground text-primary'
                          : status === 'completed' ?'bg-success text-success-foreground' :'bg-muted text-muted-foreground'
                      }`}>
                        {status === 'completed' ? (
                          <Icon name="Check" size={16} />
                        ) : (
                          <Icon name={step?.icon} size={16} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{step?.title}</div>
                        <div className="text-xs opacity-75">Step {step?.id}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Progress</span>
                  <span>{Math.round((currentStep / steps?.length) * 100)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / steps?.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                iconName="ChevronLeft"
                iconPosition="left"
              >
                Previous
              </Button>

              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Step {currentStep} of {steps?.length}</span>
              </div>

              {currentStep < steps?.length ? (
                <Button
                  variant="primary"
                  onClick={handleNextStep}
                  iconName="ChevronRight"
                  iconPosition="right"
                >
                  {currentStep === 4 ? 'Preview' : 'Next'}
                </Button>
              ) : (
                (<div className="w-24" />) // Spacer for alignment
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </RoleProtectedRoute>
  );
};

export default CreateAuction;