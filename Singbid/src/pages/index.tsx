"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { redirectToDashboard } from '../utils/roleBasedRouting';

export default function HomePage() {
  const router = useRouter();
  const { user, userProfile, loading, isSigningOut } = useAuth();

  useEffect(() => {
    // Don't do anything while loading or signing out
    if (loading || isSigningOut) return;
    
    // Only redirect if user is trying to access the root path
    if (router.asPath === '/') {
      if (user) {
        // If user exists but no profile role, default to bidder dashboard
        // Add a timeout to prevent infinite waiting for profile
        const timeoutId = setTimeout(() => {
          console.log('Profile loading timeout, redirecting with default role');
          const role = userProfile?.user_role || 'bidder';
          redirectToDashboard(router, role);
        }, 3000);
        
        // If we have a profile or after timeout, redirect immediately
        if (userProfile?.user_role) {
          clearTimeout(timeoutId);
          redirectToDashboard(router, userProfile.user_role);
        }
        
        return () => clearTimeout(timeoutId);
      } else {
        // Redirect unauthenticated users to home page
        router.push('/home-page');
      }
    }
  }, [router, user, userProfile, loading, isSigningOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {isSigningOut ? 'Signing Out...' : 'Loading SingBid...'}
        </h1>
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
      </div>
    </div>
  );
}