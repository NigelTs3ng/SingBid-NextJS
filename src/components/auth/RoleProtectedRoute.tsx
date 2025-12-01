import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { hasRouteAccess } from '../../utils/roleBasedRouting';
import SellerUpgradePrompt from './SellerUpgradePrompt';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('bidder' | 'seller')[];
  requireAuth?: boolean;
  fallbackPath?: string;
}

export default function RoleProtectedRoute({ 
  children, 
  allowedRoles,
  requireAuth = true,
  fallbackPath = '/auth/login'
}: RoleProtectedRouteProps) {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [profileCheckDelay, setProfileCheckDelay] = useState(true);

  // Add delay to allow background profile fetch to complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setProfileCheckDelay(false);
    }, 500); // Wait 500ms for profile to load
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || profileCheckDelay) return;

    // If authentication is required and user is not logged in
    if (requireAuth && !user) {
      router.push(fallbackPath);
      return;
    }

    // If user is logged in and we have role restrictions
    if (user && userProfile && allowedRoles) {
      if (!allowedRoles.includes(userProfile.user_role)) {
        // If bidder is trying to access seller pages, show upgrade prompt
        if (userProfile.user_role === 'bidder' && allowedRoles.includes('seller')) {
          setShowUpgradePrompt(true);
          return;
        }
        
        // Otherwise redirect to appropriate dashboard
        if (userProfile.user_role === 'bidder') {
          router.push('/dashboard/bidder');
        } else if (userProfile.user_role === 'seller') {
          router.push('/dashboard/seller');
        } else {
          router.push('/');
        }
        return;
      }
    }

    // Check route access if user is authenticated
    if (user && userProfile) {
      const currentPath = router.asPath;
      if (!hasRouteAccess(userProfile.user_role, currentPath)) {
        // Redirect to appropriate dashboard
        if (userProfile.user_role === 'bidder') {
          router.push('/dashboard/bidder');
        } else if (userProfile.user_role === 'seller') {
          router.push('/dashboard/seller');
        } else {
          router.push('/');
        }
        return;
      }
    }
  }, [user, userProfile, loading, profileCheckDelay, router, allowedRoles, requireAuth, fallbackPath]);

  // Show loading while checking authentication or during profile delay
  if (loading || profileCheckDelay) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required and user is not logged in, don't render children
  if (requireAuth && !user) {
    return null;
  }

  // If we should show the seller upgrade prompt
  if (showUpgradePrompt) {
    return <SellerUpgradePrompt />;
  }

  // If role restrictions exist and user doesn't have access, don't render children
  if (user && userProfile && allowedRoles && !allowedRoles.includes(userProfile.user_role)) {
    return null;
  }

  return <>{children}</>;
}