"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { auctionService } from '../../lib/services';
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
  const { isAuthenticated, user } = useAuth();
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

  // Check authentication
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/signin?redirect=/create-auction');
    }
  }, [isAuthenticated, router]);

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

  // Show loading if not authenticated yet
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Icon name="Loader" size={32} className="animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

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