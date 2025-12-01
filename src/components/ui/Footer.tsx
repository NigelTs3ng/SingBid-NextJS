"use client";
import React from 'react';
import { useRouter } from 'next/router';
import Icon from '../AppIcon';
import Button from './Button';

export default function Footer() {
  const router = useRouter();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Gavel" size={20} color="white" />
              </div>
              <span className="text-xl font-bold text-foreground">BidWin</span>
            </div>
            <p className="text-muted-foreground">
              Singapore's trusted online auction marketplace connecting buyers and sellers 
              across the island nation.
            </p>
            <div className="flex space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                iconName="Facebook" 
                className="p-2"
                onClick={() => window.open('https://facebook.com/bidwin', '_blank')}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                iconName="Twitter" 
                className="p-2"
                onClick={() => window.open('https://twitter.com/bidwin', '_blank')}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                iconName="Instagram" 
                className="p-2"
                onClick={() => window.open('https://instagram.com/bidwin', '_blank')}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                iconName="Linkedin" 
                className="p-2"
                onClick={() => window.open('https://linkedin.com/company/bidwin', '_blank')}
              />
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Platform</h3>
            <div className="space-y-2">
              <button onClick={() => router.push('/auction-listings')} className="block text-left w-full text-muted-foreground hover:text-foreground transition-colors">Browse Auctions</button>
              <button onClick={() => router.push('/auth/signup?role=seller')} className="block text-left w-full text-muted-foreground hover:text-foreground transition-colors">Start Selling</button>
              <button onClick={() => router.push('/raffles')} className="block text-left w-full text-muted-foreground hover:text-foreground transition-colors">Raffles</button>
              <button onClick={() => router.push('/subscription-plans')} className="block text-left w-full text-muted-foreground hover:text-foreground transition-colors">Premium Plans</button>
            </div>
          </div>

          {/* Account & Support */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Account & Support</h3>
            <div className="space-y-2">
              <button onClick={() => router.push('/auth/login')} className="block text-left w-full text-muted-foreground hover:text-foreground transition-colors">Sign In</button>
              <button onClick={() => router.push('/auth/signup')} className="block text-left w-full text-muted-foreground hover:text-foreground transition-colors">Sign Up</button>
              <button onClick={() => router.push('/help')} className="block text-left w-full text-muted-foreground hover:text-foreground transition-colors">Support Center</button>
              <button onClick={() => router.push('/legal/contact')} className="block text-left w-full text-muted-foreground hover:text-foreground transition-colors">Contact Us</button>
            </div>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal & Compliance</h3>
            <div className="space-y-2">
              <button onClick={() => router.push('/legal/terms')} className="block text-left w-full text-muted-foreground hover:text-foreground transition-colors">Terms of Service</button>
              <button onClick={() => router.push('/legal/privacy')} className="block text-left w-full text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</button>
              <button onClick={() => router.push('/legal/contact')} className="block text-left w-full text-muted-foreground hover:text-foreground transition-colors">Contact Us</button>
              <a href="mailto:legal@bidwin.sg" className="block text-muted-foreground hover:text-foreground transition-colors">Legal Inquiries</a>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-8 mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} BidWin Pte Ltd. All rights reserved. 
              Licensed by ACRA (Registration: 202400001A)
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Icon name="MapPin" size={16} />
                <span>Made in Singapore</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Icon name="Shield" size={16} />
                <span>SSL Secured</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

