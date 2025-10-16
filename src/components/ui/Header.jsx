"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Icon from '../AppIcon';
import Button from './Button';
import Image from '../AppImage';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile, loading, signOut } = useAuth();

  const navigationItems = [
    { label: 'Home', path: '/home-page', icon: 'Home' },
    { label: 'Browse Auctions', path: '/auction-listings', icon: 'Search' },
    { label: 'Create Auction', path: '/create-auction', icon: 'Plus' },
    { label: 'Plans', path: '/subscription-plans', icon: 'CreditCard' },
  ];

  const accountItems = [
    { label: 'Payment Dashboard', path: '/payment-dashboard', icon: 'CreditCard' },
    { label: 'Subscription', path: '/subscription-management', icon: 'Crown' },
    { label: 'Profile Settings', path: '/profile', icon: 'User' },
    { label: 'Help & Support', path: '/help', icon: 'HelpCircle' },
    { label: 'Sign Out', path: '/logout', icon: 'LogOut' },
  ];

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
  }, [pathname]);

  const handleNavigation = (path) => {
    router.push(path);
  };

  const isActivePath = (path) => {
    return pathname === path;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      setIsAccountDropdownOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Authenticated user account items
  const authenticatedAccountItems = [
    { label: 'Payment Dashboard', path: '/payment-dashboard', icon: 'CreditCard' },
    { label: 'Subscription', path: '/subscription-management', icon: 'Crown' },
    { label: 'Profile Settings', path: '/profile', icon: 'User' },
    { label: 'Help & Support', path: '/help', icon: 'HelpCircle' },
  ];

  // Authentication buttons for non-authenticated users
  const AuthButtons = () => (
    <div className="flex items-center space-x-3">
      <Link href="/auth/login">
        <Button variant="ghost" size="sm">
          Sign In
        </Button>
      </Link>
      <Link href="/auth/signup">
        <Button size="sm">
          Sign Up
        </Button>
      </Link>
    </div>
  );

  // User profile section for authenticated users
  const UserProfile = () => (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent transition-colors duration-200"
      >
        <div className="w-8 h-8 singbid-gradient rounded-full flex items-center justify-center singbid-shadow">
          <Icon name="User" size={16} color="white" />
        </div>
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-foreground">
            {userProfile?.name || user?.email?.split('@')[0]}
          </span>
          <span className="text-xs text-muted-foreground">{user?.email}</span>
        </div>
        <Icon 
          name="ChevronDown" 
          size={16} 
          className={`transition-transform duration-200 ${isAccountDropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isAccountDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-lg singbid-shadow-lg animate-fade-in">
          <div className="py-2">
            {/* User info header */}
            <div className="px-4 py-2 border-b border-border">
              <p className="text-sm font-medium text-popover-foreground">
                {userProfile?.name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            
            {/* Account menu items */}
            {authenticatedAccountItems?.map((item) => (
              <button
                key={item?.path}
                onClick={() => handleNavigation(item?.path)}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors duration-150"
              >
                <Icon name={item?.icon} size={16} />
                <span>{item?.label}</span>
              </button>
            ))}
            
            {/* Sign out button */}
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors duration-150"
              >
                <Icon name="LogOut" size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const Logo = () => (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <Image
          src="/assets/images/hammerLogo.png"
          alt="SingBid Logo"
          className="w-10 h-10 rounded-lg object-cover"
        />
      </div>
      <span className="text-xl font-bold text-foreground">SingBid</span>
    </div>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border singbid-shadow">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Logo */}
          <button 
            onClick={() => handleNavigation('/home-page')}
            className="flex-shrink-0 transition-transform duration-200 ease-out hover:scale-105"
          >
            <Logo />
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems?.map((item) => (
              <button
                key={item?.path}
                onClick={() => handleNavigation(item?.path)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-out hover:bg-accent ${
                  isActivePath(item?.path)
                    ? 'bg-primary text-primary-foreground singbid-shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={item?.icon} size={16} />
                <span>{item?.label}</span>
              </button>
            ))}
          </nav>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center">
            {loading ? (
              <div className="w-8 h-8 animate-pulse bg-muted rounded-full"></div>
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
          >
            <Icon name={isMobileMenuOpen ? "X" : "Menu"} size={24} />
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
          <div className="fixed top-0 left-0 h-full w-80 bg-card border-r border-border z-50 md:hidden animate-slide-in singbid-shadow-lg">
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
                        <div className="w-10 h-10 singbid-gradient rounded-full flex items-center justify-center">
                          <Icon name="User" size={20} color="white" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {userProfile?.name || 'User'}
                          </p>
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Link href="/auth/login" className="block">
                        <Button variant="outline" fullWidth onClick={() => setIsMobileMenuOpen(false)}>
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/auth/signup" className="block">
                        <Button fullWidth onClick={() => setIsMobileMenuOpen(false)}>
                          Sign Up
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
                      ? 'bg-primary text-primary-foreground singbid-shadow'
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
                    className="w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors duration-200 text-foreground hover:bg-accent border-t border-border mt-2 pt-3"
                  >
                    <Icon name="LogOut" size={20} />
                    <span>Sign Out</span>
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