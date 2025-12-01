"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Icon from '../AppIcon';
import Button from './Button';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState('');
  const dropdownRef = useRef(null);
  const router = useRouter();
  const pathname = router.pathname;
  const { user, userProfile, loading, signOut, isSigningOut } = useAuth();
  const [isSigningOutLocal, setIsSigningOutLocal] = useState(false);

  // Role-specific navigation items (kept minimal on the top bar)
  const bidderNavigationItems = [
    { label: 'My Bids', path: '/bid-history', icon: 'History' },
  ];

  const sellerNavigationItems = [
    { label: 'Payouts', path: '/seller/payouts', icon: 'Wallet' },
  ];

  // Get navigation items based on user role
  const getNavigationItems = () => {
    // Determine role-specific home path
    let homePath = '/home-page';
    if (user && userProfile?.user_role) {
      const role = userProfile.user_role.toLowerCase();
      if (role === 'seller') {
        homePath = '/home/seller';
      } else if (role === 'bidder') {
        homePath = '/home/bidder';
      }
    }

    const baseNavigationItems = [
      { label: 'Home', path: homePath, icon: 'Home' },
      { label: 'Browse Auctions', path: '/auction-listings', icon: 'Search' },
      { label: 'Raffles', path: '/raffles', icon: 'Ticket' },
    ];

    if (!user || !userProfile) {
      return baseNavigationItems;
    }

    if (userProfile.user_role === 'bidder') {
      return [...baseNavigationItems, ...bidderNavigationItems];
    } else if (userProfile.user_role === 'seller') {
      return [...baseNavigationItems, ...sellerNavigationItems];
    }

    return baseNavigationItems;
  };

  const navigationItems = getNavigationItems();

  // Role-specific account items
  const getAccountItems = () => {
    const baseAccountItems = [
      { label: 'Profile Settings', path: '/profile', icon: 'User' },
      { label: 'Help & Support', path: '/help', icon: 'HelpCircle' },
    ];

    if (!user || !userProfile) {
      return baseAccountItems;
    }

    if (userProfile.user_role === 'bidder') {
      return [
        { label: 'Dashboard', path: '/dashboard/bidder', icon: 'Layout' },
        ...baseAccountItems,
      ];
    } else if (userProfile.user_role === 'seller') {
      return [
        { label: 'Dashboard', path: '/dashboard/seller', icon: 'Layout' },
        { label: 'Payouts', path: '/seller/payouts', icon: 'Wallet' },
        { label: 'Analytics', path: '/seller/analytics', icon: 'BarChart' },
        { label: 'Payment Dashboard', path: '/payment-dashboard', icon: 'CreditCard' },
        { label: 'Subscription', path: '/subscription-management', icon: 'Crown' },
        ...baseAccountItems,
      ];
    }

    return baseAccountItems;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef?.current && !dropdownRef?.current?.contains(event?.target)) {
        setIsAccountDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsAccountDropdownOpen(false);
    setIsNavigating(false);
    setNavigatingTo('');
  }, [pathname]);

  // Listen for router events to show/hide loading states
  useEffect(() => {
    const handleRouteChangeStart = (url) => {
      setIsNavigating(true);
      setNavigatingTo(url);
    };
    
    const handleRouteChangeComplete = () => {
      setIsNavigating(false);
      setNavigatingTo('');
    };
    
    const handleRouteChangeError = () => {
      setIsNavigating(false);
      setNavigatingTo('');
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router.events]);

  const handleNavigation = (path) => {
    router.push(path);
  };

  const isActivePath = (path) => {
    return pathname === path;
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOutLocal(true);
      setIsAccountDropdownOpen(false); // Close dropdown immediately
      
      // Sign out and navigate
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOutLocal(false);
    }
  };

  // Get authenticated account items based on role
  const authenticatedAccountItems = getAccountItems();

  // Authentication buttons for non-authenticated users
  const AuthButtons = () => (
    <div className="flex items-center space-x-3">
      <Link href="/auth/login" onClick={() => {setIsNavigating(true); setNavigatingTo('/auth/login')}}>
        <Button variant="ghost" size="sm" disabled={isNavigating}>
          {isNavigating && navigatingTo === '/auth/login' ? (
            <>
              <div className="w-4 h-4 animate-spin border border-current border-t-transparent rounded-full mr-2" />
              <span>Loading...</span>
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </Link>
      <Link href="/auth/signup" onClick={() => {setIsNavigating(true); setNavigatingTo('/auth/signup')}}>
        <Button size="sm" disabled={isNavigating}>
          {isNavigating && navigatingTo === '/auth/signup' ? (
            <>
              <div className="w-4 h-4 animate-spin border border-current border-t-transparent rounded-full mr-2" />
              <span>Loading...</span>
            </>
          ) : (
            'Sign Up'
          )}
        </Button>
      </Link>
    </div>
  );

  // User profile section for authenticated users
  const UserProfile = () => (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors duration-200"
        aria-label="Account menu"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center bidwin-shadow overflow-hidden">
          {userProfile?.profile_picture_url ? (
            <img src={userProfile.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bidwin-gradient flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {userProfile?.name
                  ? (() => {
                      const parts = userProfile.name.split(' ')
                      if (parts.length >= 2) {
                        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                      }
                      return parts[0].substring(0, 2).toUpperCase()
                    })()
                  : 'U'}
              </span>
            </div>
          )}
        </div>
        <Icon
          name="ChevronDown"
          size={16}
          className={`transition-transform duration-200 ${isAccountDropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isAccountDropdownOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-popover border border-border rounded-lg bidwin-shadow-lg animate-fade-in">
          <div className="py-2">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-popover-foreground">
                {userProfile?.name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {userProfile?.user_role || 'User'} • {user?.email}
              </p>
            </div>

            {/* Account menu items */}
            {authenticatedAccountItems?.map((item) => (
              <button
                key={item?.path}
                onClick={() => handleNavigation(item?.path)}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors duration-150"
              >
                <Icon name={item?.icon} size={16} />
                <span>{item?.label}</span>
              </button>
            ))}

            {/* Sign out button */}
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut || isSigningOutLocal}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(isSigningOut || isSigningOutLocal) ? (
                  <>
                    <div className="w-4 h-4 animate-spin border border-current border-t-transparent rounded-full" />
                    <span>Signing Out...</span>
                  </>
                ) : (
                  <>
                    <Icon name="LogOut" size={16} />
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const Logo = () => (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-white border border-border">
        <img src="/assets/images/logo.jpg" alt="BidWin" className="h-9 w-9 object-cover" />
      </div>
      <span className="text-lg font-bold text-foreground">BidWin</span>
    </div>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4">
          {/* Left: Logo */}
          <button
            onClick={() => handleNavigation('/')}
            className="flex-shrink-0 transition-transform duration-200 ease-out hover:scale-[1.02]"
          >
            <Logo />
          </button>

          {/* Center: Primary nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navigationItems?.map((item) => (
              <button
                key={item?.path}
                onClick={() => handleNavigation(item?.path)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent ${
                  isActivePath(item?.path) ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Icon name={item?.icon} size={16} />
                <span className="hidden lg:inline">{item?.label}</span>
              </button>
            ))}
          </nav>

          {/* Right: Quick actions + account */}
          <div className="hidden md:flex items-center gap-2">
            {/* Create menu for sellers */}
            {user && userProfile?.user_role === 'seller' && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsAccountDropdownOpen(false) || setIsMobileMenuOpen(false)}
                  className="hidden"
                />
              </div>
            )}
            {user && userProfile?.user_role === 'seller' && (
              <div className="relative">
                <details className="group">
                  <summary className="list-none flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-accent cursor-pointer">
                    <Icon name="Plus" size={16} />
                    <span className="text-sm font-medium">Create</span>
                    <Icon name="ChevronDown" size={14} className="transition group-open:rotate-180" />
                  </summary>
                  <div className="absolute right-0 mt-2 w-44 bg-popover border border-border rounded-md bidwin-shadow-lg p-1">
                    <button onClick={() => handleNavigation('/create-auction')} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-accent">
                      <Icon name="PackagePlus" size={16} />
                      <span>Create Auction</span>
                    </button>
                    <button onClick={() => handleNavigation('/create-raffle')} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-accent">
                      <Icon name="Ticket" size={16} />
                      <span>Create Raffle</span>
                    </button>
                  </div>
                </details>
              </div>
            )}

            {(loading || isSigningOut || isSigningOutLocal) ? (
              <div className="w-8 h-8 animate-pulse bg-muted rounded-full" />
            ) : user ? (
              <UserProfile />
            ) : (
              <AuthButtons />
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors duration-200"
            aria-label="Toggle menu"
          >
            <Icon name={isMobileMenuOpen ? 'X' : 'Menu'} size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Panel */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
<div className="fixed top-0 left-0 h-full w-80 bg-card border-r border-border z-50 md:hidden animate-slide-in bidwin-shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Logo />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-accent transition-colors duration-200"
              >
                <Icon name="X" size={20} />
              </button>
            </div>

            <div className="flex flex-col p-4 space-y-2">
              {/* Mobile Auth Section */}
              {!loading && (
                <div className="mb-4 pb-4 border-b border-border">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-accent rounded-lg">
                        <div className="w-10 h-10 bidwin-gradient rounded-full flex items-center justify-center">
                          <Icon name="User" size={20} color="white" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {userProfile?.name || 'User'}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {userProfile?.user_role || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Link href="/auth/login" className="block" onClick={() => {setIsNavigating(true); setNavigatingTo('/auth/login')}}>
                        <Button variant="outline" fullWidth disabled={isNavigating} onClick={() => setIsMobileMenuOpen(false)}>
                          {isNavigating && navigatingTo === '/auth/login' ? (
                            <>
                              <div className="w-4 h-4 animate-spin border border-current border-t-transparent rounded-full mr-2" />
                              <span>Loading...</span>
                            </>
                          ) : (
                            'Sign In'
                          )}
                        </Button>
                      </Link>
                      <Link href="/auth/signup" className="block" onClick={() => {setIsNavigating(true); setNavigatingTo('/auth/signup')}}>
                        <Button fullWidth disabled={isNavigating} onClick={() => setIsMobileMenuOpen(false)}>
                          {isNavigating && navigatingTo === '/auth/signup' ? (
                            <>
                              <div className="w-4 h-4 animate-spin border border-current border-t-transparent rounded-full mr-2" />
                              <span>Loading...</span>
                            </>
                          ) : (
                            'Sign Up'
                          )}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Items */}
              {navigationItems?.map((item) => (
                <button
                  key={item?.path}
                  onClick={() => handleNavigation(item?.path)}
                  className={`flex items-center space-x-3 p-3 rounded-lg text-left transition-colors duration-200 ${
                    isActivePath(item?.path)
                      ? 'bg-primary text-primary-foreground bidwin-shadow'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon name={item?.icon} size={20} />
                  <span className="font-medium">{item?.label}</span>
                </button>
              ))}

              {/* Authenticated user menu items in mobile */}
              {user && (
                <div className="border-t border-border pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-3">Account</h3>
                  {authenticatedAccountItems?.map((item) => (
                    <button
                      key={item?.path}
                      onClick={() => handleNavigation(item?.path)}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors duration-200 text-foreground hover:bg-accent"
                    >
                      <Icon name={item?.icon} size={20} />
                      <span>{item?.label}</span>
                    </button>
                  ))}
                  
                  {/* Mobile Sign Out */}
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut || isSigningOutLocal}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors duration-200 text-foreground hover:bg-accent border-t border-border mt-2 pt-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(isSigningOut || isSigningOutLocal) ? (
                      <>
                        <div className="w-5 h-5 animate-spin border border-current border-t-transparent rounded-full" />
                        <span>Signing Out...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="LogOut" size={20} />
                        <span>Sign Out</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  );
};

export default Header;