import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { userService } from '../../../lib/services';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/ui/Header';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const SignUp = () => {
  const router = useRouter();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'SG'
    },
    accountType: 'buyer'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (error) setError(null);

    if (name === 'password') {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1;
    if (password.match(/\d/)) strength += 1;
    if (password.match(/[^a-zA-Z\d\s]/)) strength += 1;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return { text: 'Weak', color: 'text-destructive' };
      case 2: return { text: 'Fair', color: 'text-warning' };
      case 3: return { text: 'Good', color: 'text-primary' };
      case 4: return { text: 'Strong', color: 'text-success' };
      default: return { text: 'Weak', color: 'text-destructive' };
    }
  };

  const getPasswordStrengthWidth = () => {
    return `${(passwordStrength / 4) * 100}%`;
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.username.trim()) return 'Username is required';
    if (formData.username.length < 3) return 'Username must be at least 3 characters';
    if (!formData.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Please enter a valid email';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.phoneNumber.trim()) return 'Phone number is required';
    if (!formData.dateOfBirth) return 'Date of birth is required';
    if (!formData.address.line1.trim()) return 'Address line 1 is required';
    if (!formData.address.city.trim()) return 'City is required';
    if (!formData.address.postalCode.trim()) return 'Postal code is required';
    if (!agreedToTerms) return 'You must agree to the terms and conditions';

    const phoneRegex = /^(\+65|65)?[689]\d{7}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
      return 'Please enter a valid Singapore phone number';
    }

    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) return 'You must be at least 18 years old to register';

    return null;
  };

  const handleNextStep = () => {
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const validationError = validateStep2();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await signUp(
        formData.email, 
        formData.password,
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
          username: formData.username,
          phone: formData.phoneNumber,
          date_of_birth: formData.dateOfBirth,
          account_type: formData.accountType,
          address: JSON.stringify(formData.address)
        }
      );
      
      if (authError) {
        setError(authError.message || 'Failed to create account. Please try again.');
        return;
      }

      if (data?.user) {
        console.log('User created in auth, ID:', data.user.id);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (checkError && checkError.code === 'PGRST116') {
            const { data: createdUser, error: userError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: formData.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (userError) {
              console.error('Failed to create user record:', userError);
            }
          }

          const { data: existingProfile, error: profileCheckError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('user_id', data.user.id)
            .single();

          if (profileCheckError && profileCheckError.code === 'PGRST116') {
            const { data: createdProfile, error: profileError } = await supabase
              .from('user_profiles')
              .insert({
                user_id: data.user.id,
                username: formData.username,
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone_number: formData.phoneNumber,
                date_of_birth: formData.dateOfBirth,
                address_line1: formData.address.line1,
                address_line2: formData.address.line2,
                address_city: formData.address.city,
                address_state: formData.address.state,
                address_postal_code: formData.address.postalCode,
                address_country: formData.address.country,
                preferred_account_type: formData.accountType,
                stripe_ready: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (profileError) {
              console.error('Failed to create user profile:', profileError);
            }
          }

        } catch (tableError) {
          console.error('Error managing user tables:', tableError);
        }

        const redirectUrl = formData.accountType === 'seller' 
          ? '/auth/verify-email?email=' + encodeURIComponent(formData.email) + '&type=seller'
          : '/auth/verify-email?email=' + encodeURIComponent(formData.email);
          
        router.push(redirectUrl);
      }
    } catch (err) {
      console.error('Sign up error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Image
                  src="/assets/images/hammerLogo.png"
                  alt="SingBid Logo"
                  className="w-16 h-16 rounded-lg object-cover"
                />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join SingBid and start bidding on amazing items
            </p>
          </div>

          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Account</span>
            </div>
            <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Details</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 text-destructive">
                  <Icon name="AlertCircle" size={16} />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <form className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">
                    I want to:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, accountType: 'buyer' }))}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.accountType === 'buyer'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <Icon name="ShoppingCart" size={20} className="mx-auto mb-2" />
                      <div className="text-sm font-medium">Buy Items</div>
                      <div className="text-xs opacity-75">Bid on auctions</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, accountType: 'seller' }))}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.accountType === 'seller'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <Icon name="Store" size={20} className="mx-auto mb-2" />
                      <div className="text-sm font-medium">Sell Items</div>
                      <div className="text-xs opacity-75">Create auctions</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
                      First name
                    </label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="John"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
                      Last name
                    </label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="username" className="block text-sm font-medium text-foreground">
                    Username
                  </label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="johndoe"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be your unique identifier on SingBid
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Email address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a strong password"
                      className="w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <Icon
                        name={showPassword ? "EyeOff" : "Eye"}
                        size={16}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      />
                    </button>
                  </div>
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Password strength</span>
                        <span className={`text-xs font-medium ${getPasswordStrengthText().color}`}>
                          {getPasswordStrengthText().text}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength <= 1 ? 'bg-destructive' :
                            passwordStrength === 2 ? 'bg-warning' :
                            passwordStrength === 3 ? 'bg-primary' : 'bg-success'
                          }`}
                          style={{ width: getPasswordStrengthWidth() }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      className="w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <Icon
                        name={showConfirmPassword ? "EyeOff" : "Eye"}
                        size={16}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      />
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-destructive flex items-center space-x-1">
                      <Icon name="X" size={12} />
                      <span>Passwords do not match</span>
                    </p>
                  )}
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-xs text-success flex items-center space-x-1">
                      <Icon name="Check" size={12} />
                      <span>Passwords match</span>
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="default"
                  size="lg"
                  fullWidth
                  onClick={handleNextStep}
                  iconName="ArrowRight"
                  iconPosition="right"
                >
                  Continue
                </Button>
              </form>
            )}

            {currentStep === 2 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-foreground">
                    Phone Number
                  </label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="+65 9123 4567"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for account verification and payment processing
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-foreground">
                    Date of Birth
                  </label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    You must be 18+ to use SingBid
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground">Address Information</h3>
                  
                  <div className="space-y-2">
                    <Input
                      name="address.line1"
                      placeholder="Street address"
                      required
                      value={formData.address.line1}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      name="address.line2"
                      placeholder="Apartment, suite, etc. (optional)"
                      value={formData.address.line2}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      name="address.city"
                      placeholder="City"
                      required
                      value={formData.address.city}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                    <Input
                      name="address.postalCode"
                      placeholder="Postal code"
                      required
                      value={formData.address.postalCode}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border rounded"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the{' '}
                    <Link href="/terms" className="text-primary hover:text-primary/80 font-medium">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-primary hover:text-primary/80 font-medium">
                      Privacy Policy
                    </Link>
                    {formData.accountType === 'seller' && (
                      <>
                        {', and understand that I will need to complete additional verification to sell items'}
                      </>
                    )}
                  </label>
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handlePrevStep}
                    iconName="ArrowLeft"
                    iconPosition="left"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    loading={loading}
                    disabled={!agreedToTerms}
                    iconName="UserPlus"
                    iconPosition="left"
                    className="flex-1"
                  >
                    {loading ? 'Creating account...' : 'Create account'}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link 
                href="/auth/signin" 
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;