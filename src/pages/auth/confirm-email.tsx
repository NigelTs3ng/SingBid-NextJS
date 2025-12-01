import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';

export default function ConfirmEmailPage() {
  const router = useRouter();
  const { email } = router.query;
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    // Listen for auth state changes (when user clicks confirmation link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Fetch user profile to get role
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('user_role')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching user profile:', profileError);
            // Fallback to home page
            router.push('/');
          } else {
            // Redirect based on role
            if (userProfile.user_role === 'bidder') {
              router.push('/dashboard/bidder');
            } else {
              router.push('/dashboard/seller');
            }
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const handleResendEmail = async () => {
    if (!email || typeof email !== 'string') return;

    setIsResending(true);
    setResendMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        setResendMessage('Failed to resend confirmation email. Please try again.');
      } else {
        setResendMessage('Confirmation email sent! Please check your inbox.');
      }
    } catch (error) {
      console.error('Resend email error:', error);
      setResendMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Check Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We&apos;ve sent a confirmation link to {email && <span className="font-medium">{email}</span>}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">Almost there!</h3>
              <p className="text-sm text-gray-600">
                Click the confirmation link in your email to activate your BidWin account.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    Don&apos;t see the email? Check your spam folder or click below to resend.
                  </p>
                </div>
              </div>
            </div>

            {resendMessage && (
              <div className={`rounded-md p-4 ${resendMessage.includes('sent') 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm font-medium ${resendMessage.includes('sent') 
                  ? 'text-green-800' 
                  : 'text-red-800'}`}>
                  {resendMessage}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                variant="outline"
                fullWidth
                loading={isResending}
                disabled={isResending || !email}
              >
                {isResending ? 'Sending...' : 'Resend Confirmation Email'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Wrong email address?{' '}
                  <Link
                    href="/auth/signup"
                    className="font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Sign up again
                  </Link>
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already confirmed?{' '}
                  <Link
                    href="/auth/login"
                    className="font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}