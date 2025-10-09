import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/ui/Header';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const ForgotPassword = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim()) {
      setError('Email address is required');
      setLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message || 'Failed to send reset email. Please try again.');
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    router.push('/auth/signin');
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            {/* Success State */}
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
              <div className="w-16 h-16 mx-auto mb-6 bg-success/10 rounded-full flex items-center justify-center">
                <Icon name="CheckCircle" size={32} className="text-success" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We've sent password reset instructions to
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {email}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Check your email</p>
                    <p className="text-xs text-muted-foreground">Look for a password reset email from SingBid</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Click the reset link</p>
                    <p className="text-xs text-muted-foreground">This will take you to a secure page to set a new password</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Create new password</p>
                    <p className="text-xs text-muted-foreground">Choose a strong password and sign in</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Icon name="Info" size={16} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Didn't receive the email? Check your spam folder or wait a few minutes and try again.
                      If you continue to have issues, please contact support.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={handleBackToSignIn}
                iconName="ArrowLeft"
                iconPosition="left"
              >
                Back to sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
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
            <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
              <Icon name="Lock" size={32} className="text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              Forgot your password?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No worries! Enter your email and we'll send you reset instructions
            </p>
          </div>

          {/* Reset Form */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-destructive">
                    <Icon name="AlertCircle" size={16} />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Email Field */}
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
                  value={email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  We'll send password reset instructions to this email
                </p>
              </div>

              {/* Reset Button */}
              <Button
                type="submit"
                variant="default"
                size="lg"
                fullWidth
                loading={loading}
                disabled={!email}
                iconName="Mail"
                iconPosition="left"
              >
                {loading ? 'Sending reset email...' : 'Send reset instructions'}
              </Button>
            </form>
          </div>

          {/* Back to Sign In */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={handleBackToSignIn}
              iconName="ArrowLeft"
              iconPosition="left"
            >
              Back to sign in
            </Button>
          </div>

          {/* Help Section */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Still having trouble?{' '}
              <Link href="/help" className="text-primary hover:text-primary/80 font-medium">
                Contact support
              </Link>
              {' '}for assistance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;