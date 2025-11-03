import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '../lib/supabase-browser';
import type { Database } from '../lib/supabase';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  isSigningOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileFetching, setProfileFetching] = useState(false);
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null);
  const [hasRealProfile, setHasRealProfile] = useState(false);
  
  // Create Supabase client for browser
  const supabase = createClient();
  
  // Helper to save profile to localStorage
  const saveProfileToStorage = (profile: UserProfile) => {
    try {
      localStorage.setItem('userProfile', JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to save profile to localStorage:', error);
    }
  };
  
  // Helper to load profile from localStorage
  const loadProfileFromStorage = (): UserProfile | null => {
    try {
      const stored = localStorage.getItem('userProfile');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load profile from localStorage:', error);
      return null;
    }
  };

  const fetchUserProfile = async (userId: string) => {
    // Skip if we already have profile for this user or if fetching
    if (profileFetching || (lastFetchedUserId === userId && userProfile)) {
      console.log('Skipping profile fetch - already have data or in progress');
      return userProfile;
    }
    
    try {
      setProfileFetching(true);
      console.log('fetchUserProfile: Starting for userId:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      console.log('fetchUserProfile: Result:', { data, error });

      if (error) {
        console.error('Error fetching user profile:', error);
        // If profile doesn't exist, that's OK - user might be new
        if (error.code === 'PGRST116') {
          console.log('User profile not found - this is OK for new users');
        }
        return null;
      }

      setLastFetchedUserId(userId);
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    } finally {
      setProfileFetching(false);
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    }
  };

  const signOut = async () => {
    try {
      setIsSigningOut(true);
      
      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 5000)
      );
      
      // Race between signOut and timeout
      try {
        await Promise.race([
          supabase.auth.signOut(),
          timeoutPromise
        ]);
      } catch (error) {
        console.error('Error signing out:', error);
        // Continue with local state clearing even if signOut fails
      }
      
      // Always clear local state
      setUser(null);
      setUserProfile(null);
      setSession(null);
      setLoading(false);
      
    } catch (error) {
      console.error('Error in sign out process:', error);
      // Clear state even if there's an error
      setUser(null);
      setUserProfile(null);
      setSession(null);
      setLoading(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    console.log('AuthContext: Starting initialization');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthContext: Getting initial session');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('AuthContext: Initial session result:', { session: !!session, user: !!session?.user, error });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Try to use stored profile first, then fetch real one
        if (session?.user) {
          const storedProfile = loadProfileFromStorage();
          
          if (storedProfile && storedProfile.id === session.user.id) {
            console.log('AuthContext: Using stored profile:', storedProfile);
            setUserProfile(storedProfile);
            setHasRealProfile(true);
          } else {
            console.log('AuthContext: No stored profile, setting temporary one');
            // Set a basic profile with default role
            setUserProfile({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || 'User',
              user_role: 'bidder', // Temporary default role
              created_at: new Date().toISOString(),
              stripe_customer_id: null
            });
            setHasRealProfile(false);
          }
          
          // Always fetch real profile in background to ensure it's up to date
          setTimeout(async () => {
            try {
              console.log('AuthContext: Fetching real profile in background');
              const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (data && !error) {
                console.log('AuthContext: Got real profile, updating:', data);
                setUserProfile(data);
                setHasRealProfile(true);
                saveProfileToStorage(data);
              } else {
                console.log('AuthContext: Could not fetch real profile');
              }
            } catch (error) {
              console.error('Background profile fetch error:', error);
            }
          }, 100); // Fetch after a short delay
        }
        
        console.log('AuthContext: Setting loading to false');
        setLoading(false);
      } catch (error) {
        console.error('AuthContext: Error in getInitialSession:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', { event, hasSession: !!session, hasUser: !!session?.user });
        
        // Always update session and user state for auth changes
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle auth state changes without overriding real profile
        if (session?.user && lastFetchedUserId !== session.user.id && !hasRealProfile) {
          console.log('AuthContext: Auth event for new user:', event);
          
          // Try stored profile first
          const storedProfile = loadProfileFromStorage();
          if (storedProfile && storedProfile.id === session.user.id) {
            console.log('AuthContext: Using stored profile for auth event');
            setUserProfile(storedProfile);
            setHasRealProfile(true);
          } else {
            console.log('AuthContext: Setting temporary profile for auth event');
            setUserProfile({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || 'User',
              user_role: 'bidder', // Temporary default role
              created_at: new Date().toISOString(),
              stripe_customer_id: null
            });
          }
          setLastFetchedUserId(session.user.id);
          
          // Fetch real profile in background
          setTimeout(async () => {
            try {
              console.log('AuthContext: Fetching real profile for auth event');
              const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (data && !error) {
                console.log('AuthContext: Got real profile for auth event, updating:', data);
                setUserProfile(data);
                setHasRealProfile(true);
                saveProfileToStorage(data);
              }
            } catch (error) {
              console.error('Background profile fetch error in auth change:', error);
            }
          }, 100);
        } else if (!session?.user) {
          // Clear profile when user signs out
          setUserProfile(null);
          setLastFetchedUserId(null);
          setHasRealProfile(false);
          localStorage.removeItem('userProfile');
        } else if (session?.user && hasRealProfile) {
          console.log('AuthContext: Auth event but we already have real profile, skipping override');
        }
        
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    loading,
    signOut,
    refreshUserProfile,
    isSigningOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
