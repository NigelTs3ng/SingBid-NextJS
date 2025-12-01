import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Icon from '../../components/AppIcon';
import { cn } from '../../utils/cn';

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  userRole: 'bidder' | 'seller';
  referralCode?: string;
}

interface SignupErrors {
  name?: string;
  email?: string;
  password?: string;
  userRole?: string;
  general?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    userRole: 'bidder',
    referralCode: '',
  });
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const refCode = typeof router.query.ref === 'string' ? router.query.ref.trim().toLowerCase() : '';
    if (refCode) {
      setFormData((prev) => ({
        ...prev,
        referralCode: refCode,
      }));
    }
  }, [router.query.ref]);

  const validateForm = (): boolean => {
    const newErrors: SignupErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!formData.userRole) {
      newErrors.userRole = 'Please select your role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific field error when user starts typing
    if (errors[name as keyof SignupErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleRoleChange = (value: 'bidder' | 'seller') => {
    setFormData(prev => ({
      ...prev,
      userRole: value
    }));
    
    // Clear role error when user selects a role
    if (errors.userRole) {
      setErrors(prev => ({
        ...prev,
        userRole: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name.trim(),
            user_role: formData.userRole,
            pending_referral_code: formData.referralCode?.trim()
              ? formData.referralCode.trim().toLowerCase()
              : null,
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setErrors({ email: 'An account with this email already exists' });
        } else {
          setErrors({ general: error.message });
        }
        return;
      }

      if (data.user) {
        router.push('/auth/login?signup=success&email=' + encodeURIComponent(formData.email));
      }
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Back to Home Link */}
      <button
        onClick={() => router.push('/home-page')}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center space-x-2 text-sm text-gray-600 hover:text-primary transition-colors group"
      >
        <Icon name="ArrowLeft" size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span>Back to Home</span>
      </button>

      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
Join BidWin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account and start bidding on amazing items.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {errors.general && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{errors.general}</p>
                  </div>
                </div>
              </div>
            )}

            <Input
              id="name"
              name="name"
              type="text"
              label="Full Name"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              required
              autoComplete="name"
              placeholder="Enter your full name"
            />

            <Select
              id="userRole"
              name="userRole"
              label="I want to join as a"
              value={formData.userRole}
              onChange={handleRoleChange}
              error={errors.userRole}
              required
              options={[
                { 
                  value: 'bidder', 
                  label: 'Bidder', 
                  description: 'Browse and bid on auctions' 
                },
                { 
                  value: 'seller', 
                  label: 'Seller', 
                  description: 'Create and manage auctions' 
                }
              ]}
              placeholder="Select your role"
            />

            <Input
              id="email"
              name="email"
              type="email"
              label="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              error={errors.email}
              required
              autoComplete="email"
              placeholder="Enter your email"
            />

            <Input
              id="referralCode"
              name="referralCode"
              type="text"
              label="Referral Code (optional)"
              value={formData.referralCode || ''}
              onChange={handleInputChange}
              description="Have a friend's code? Enter it to earn extra BidCoins for you and your referrer."
              placeholder="Enter referral code"
            />

            <div className="space-y-2">
              <label
                htmlFor="password"
                className={cn(
                  "text-sm font-medium leading-none",
                  errors.password ? "text-red-600" : "text-gray-900"
                )}
              >
                Password
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  className={cn(
                    "flex h-10 w-full rounded-md border-2 bg-white px-3 py-2 pr-10 text-sm text-slate-900 ring-offset-background placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
                    errors.password
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-200"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <Icon name="EyeOff" size={20} className="text-gray-500" />
                  ) : (
                    <Icon name="Eye" size={20} className="text-gray-500" />
                  )}
                </button>
              </div>
              {!errors.password && (
                <p className="text-sm text-gray-500">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              )}
              {errors.password && (
                <p className="text-sm text-red-600">
                  {errors.password}
                </p>
              )}
            </div>

          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <Input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="text-gray-600">
                I agree to the{' '}
                <Link
                  href="/terms"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                  target="_blank"
                >
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link
                  href="/privacy"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}