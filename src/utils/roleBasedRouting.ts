import { Router } from 'next/router';
import type { Database } from '../lib/supabase';

type UserRole = Database['public']['Tables']['users']['Row']['user_role'];

/**
 * Redirects user to appropriate dashboard based on their role
 */
export const redirectToDashboard = (router: Router, userRole: UserRole) => {
  if (userRole === 'bidder') {
    router.push('/dashboard/bidder');
  } else if (userRole === 'seller') {
    router.push('/dashboard/seller');
  } else {
    // Fallback to home page to avoid infinite loops
    router.push('/home-page');
  }
};

/**
 * Gets the appropriate dashboard path for a user role
 */
export const getDashboardPath = (userRole: UserRole): string => {
  if (userRole === 'bidder') {
    return '/dashboard/bidder';
  } else if (userRole === 'seller') {
    return '/dashboard/seller';
  } else {
    return '/home-page';
  }
};

/**
 * Checks if a user has access to a specific route based on their role
 */
export const hasRouteAccess = (userRole: UserRole, route: string): boolean => {
  // Public routes accessible to all
  const publicRoutes = [
    '/',
    '/home-page',
    '/auction-listings',
    '/auth/login',
    '/auth/signup',
    '/auth/confirm-email',
    '/terms',
    '/privacy'
  ];

  if (publicRoutes.some(publicRoute => route.startsWith(publicRoute))) {
    return true;
  }

  // Bidder-specific routes
  const bidderRoutes = [
    '/home/bidder',
    '/dashboard/bidder',
    '/bid-history'
  ];

  // Seller-specific routes
  const sellerRoutes = [
    '/home/seller',
    '/dashboard/seller',
    '/create-auction',
    '/seller/',
    '/payment-dashboard',
    '/subscription-management',
    '/subscription-plans'
  ];

  if (userRole === 'bidder') {
    return bidderRoutes.some(bidderRoute => route.startsWith(bidderRoute));
  } else if (userRole === 'seller') {
    return sellerRoutes.some(sellerRoute => route.startsWith(sellerRoute));
  }

  return false;
};