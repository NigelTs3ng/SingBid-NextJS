import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/ui/Header';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const VerifyEmail = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0) return;
    
    setResendLoading(true);
    try {
      // TODO: Implement resend verification email with Supabase
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setResendSuccess(true);
      setCountdown(60); // 60 second cooldown
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error) {
      console.error('Resend error:', error);
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    router.push('/auth/signin');
  };

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
              <Icon name="Mail" size={32} className="text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We've sent a verification link to
            </p>
            {email && (
              <p className="mt-1 text-sm font-medium text-foreground">
                {email}
              </p>
            )}
          </div>

          {/* Verification Instructions */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Check your inbox</p>
                  <p className="text-xs text-muted-foreground">Look for an email from SingBid</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Click the verification link</p>
                  <p className="text-xs text-muted-foreground">This will activate your account</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Start bidding!</p>
                  <p className="text-xs text-muted-foreground">Welcome to the SingBid community</p>
                </div>
              </div>
            </div>

            {/* Resend Email Section */}
            <div className="border-t border-border pt-6">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or
                </p>
                
                {resendSuccess && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                    <div className="flex items-center justify-center space-x-2 text-success">
                      <Icon name="CheckCircle" size={16} />
                      <span className="text-sm font-medium">Verification email sent!</span>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendEmail}
                  loading={resendLoading}
                  disabled={countdown > 0}
                  iconName="RotateCcw"
                  iconPosition="left"
                  className="w-full"
                >
                  {countdown > 0 
                    ? `Resend in ${countdown}s` 
                    : resendLoading 
                      ? 'Sending...' 
                      : 'Resend verification email'
                  }
                </Button>
              </div>
            </div>

            {/* Help Section */}
            <div className="border-t border-border pt-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Icon name="HelpCircle" size={16} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Need help?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      If you continue to have issues, please{' '}
                      <Link href="/help" className="text-primary hover:text-primary/80 font-medium">
                        contact support
                      </Link>
                      {' '}or try signing up with a different email address.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;