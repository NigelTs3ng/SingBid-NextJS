"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../AppIcon';
import Button from './Button';
import Image from '../AppImage';

const Header = () => {
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, signOut, loading } = useAuth();

  const navigationItems = [
    { label: 'Home', path: '/home-page', icon: 'Home' },
    { label: 'Browse Auctions', path: '/auction-listings', icon: 'Search' },
    ...(isAuthenticated ? [{ label: 'Create Auction', path: '/create-auction', icon: 'Plus' }] : []),
    { label: 'Plans', path: '/subscription-plans', icon: 'CreditCard' },
  ];

  const accountItems = isAuthenticated ? [
    { label: 'Payment Dashboard', path: '/payment-dashboard', icon: 'CreditCard' },
    { label: 'Subscription', path: '/subscription-management', icon: 'Crown' },
    { label: 'Profile Settings', path: '/profile', icon: 'User' },
    { label: 'Help & Support', path: '/help', icon: 'HelpCircle' },
    { label: 'Sign Out', action: 'signOut', icon: 'LogOut' },
  ] : [
    { label: 'Sign In', path: '/auth/signin', icon: 'LogIn' },
    { label: 'Sign Up', path: '/auth/signup', icon: 'UserPlus' },
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

  const handleAccountAction = async (item) => {
    if (item.action === 'signOut') {
      await signOut();
      router.push('/');
    } else {
      handleNavigation(item.path);
    }
  };

  const isActivePath = (path) => {
    return pathname === path;
  };

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

          {/* Desktop Account Dropdown */}
          <div className="hidden md:flex items-center space-x-4">
            {!loading && (
              <div className="relative" ref={dropdownRef}>
                {isAuthenticated ? (
                  <button
                    onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent transition-colors duration-200"
                  >
                    <div className="w-8 h-8 singbid-gradient rounded-full flex items-center justify-center singbid-shadow">
                      <Icon name="User" size={16} color="white" />
                    </div>
                    <Icon 
                      name="ChevronDown" 
                      size={16} 
                      className={`transition-transform duration-200 ${isAccountDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigation('/auth/signin')}
                    >
                      Sign In
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleNavigation('/auth/signup')}
                    >
                      Sign Up
                    </Button>
                  </div>
                )}

                {isAccountDropdownOpen && isAuthenticated && (
                  <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-lg singbid-shadow-lg animate-fade-in">
                    <div className="py-2">
                      {accountItems?.map((item, index) => (
                        <button
                          key={item?.path || item?.action}
                          onClick={() => handleAccountAction(item)}
                          className={`w-full flex items-center space-x-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors duration-150 ${
                            index === accountItems?.length - 1 ? 'border-t border-border mt-1 pt-3' : ''
                          }`}
                        >
                          <Icon name={item?.icon} size={16} />
                          <span>{item?.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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

              <div className="border-t border-border pt-4 mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-3">Account</h3>
                {accountItems?.map((item, index) => (
                  <button
                    key={item?.path}
                    onClick={() => handleAccountAction(item)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors duration-200 text-foreground hover:bg-accent ${
                      index === accountItems?.length - 1 ? 'border-t border-border mt-2 pt-3' : ''
                    }`}
                  >
                    <Icon name={item?.icon} size={20} />
                    <span>{item?.label}</span>
                  </button>
                ))}
              </div>
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