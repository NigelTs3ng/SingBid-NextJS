'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { createClient } from '../lib/supabase-browser'
import type { Database } from '../lib/supabase'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  isSigningOut: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const isSigningOutRef = useRef(false)
  const [profileFetching, setProfileFetching] = useState(false)
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null)
  const [hasRealProfile, setHasRealProfile] = useState(false)
  
  // Supabase client for browser
  const supabase = createClient()
  
  // Helpers: storage
  const saveProfileToStorage = (profile: UserProfile) => {
    try {
      localStorage.setItem('userProfile', JSON.stringify(profile))
    } catch (error) {
      console.error('Failed to save profile to localStorage:', error)
    }
  }
  
  const loadProfileFromStorage = (): UserProfile | null => {
    try {
      const stored = localStorage.getItem('userProfile')
      if (!stored) return null
      const parsed = JSON.parse(stored) as UserProfile | null
      if (parsed && !parsed.user_role) parsed.user_role = 'bidder'
      return parsed
    } catch (error) {
      console.error('Failed to load profile from localStorage:', error)
      return null
    }
  }

  const getUserRoleFromMetadata = (
    metadata: Record<string, any> | undefined | null
  ): 'bidder' | 'seller' => {
    const rawRole = typeof metadata?.user_role === 'string' ? metadata.user_role.toLowerCase() : ''
    return rawRole === 'seller' ? 'seller' : 'bidder'
  }

  const fetchUserProfile = async (userId: string) => {
    if (profileFetching || (lastFetchedUserId === userId && userProfile)) {
      console.log('Skipping profile fetch - already have data or in progress')
      return userProfile
    }
    
    try {
      setProfileFetching(true)
      console.log('fetchUserProfile: Starting for userId:', userId)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      console.log('fetchUserProfile: Result:', { data, error })

      if (error) {
        console.error('Error fetching user profile:', error)
        if ((error as any).code === 'PGRST116') {
          console.log('User profile not found - this is OK for new users')
        }
        return null
      }

      if (data) {
        if (!data.user_role) data.user_role = 'bidder'
        saveProfileToStorage(data)
      }

      setLastFetchedUserId(userId)
      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    } finally {
      setProfileFetching(false)
    }
  }

  const refreshUserProfile = async () => {
    if (user) {
      const profile = await fetchUserProfile(user.id)
      if (profile) setUserProfile(profile)
    }
  }

  const signOut = async () => {
    try {
      setIsSigningOut(true)
      isSigningOutRef.current = true

      // Clear state first to prevent any redirects
      setUser(null)
      setUserProfile(null)
      setSession(null)
      setLastFetchedUserId(null)
      setHasRealProfile(false)

      // Clear localStorage
      try {
        localStorage.removeItem('userProfile')
        localStorage.removeItem('prefetchedBidcoins')
        localStorage.removeItem('pendingReferralCode')
      } catch (storageError) {
        console.warn('Failed to clear cached auth data', storageError)
      }

      // Sign out from Supabase (this clears cookies and session)
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 5000))
      try {
        const result = await Promise.race([supabase.auth.signOut({ scope: 'global' }), timeoutPromise])
        console.log('Sign out result:', result)
      } catch (error) {
        console.error('Error signing out:', error)
        // Even if signOut fails, we've cleared local state
      }

      setLoading(false)
    } catch (error) {
      console.error('Error in sign out process:', error)
      setUser(null)
      setUserProfile(null)
      setSession(null)
      setLastFetchedUserId(null)
      setHasRealProfile(false)
      setLoading(false)
    } finally {
      setIsSigningOut(false)
      // Delay clearing the ref to ensure any pending auth state changes are ignored
      setTimeout(() => {
        isSigningOutRef.current = false
      }, 1000)
    }
  }

  useEffect(() => {
    console.log('AuthContext: Starting initialization')
    let timeoutId: ReturnType<typeof setTimeout>
    
    const getInitialSession = async () => {
      try {
        console.log('AuthContext: Getting initial session')
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()
        console.log('AuthContext: Initial session result:', {
          session: !!session,
          user: !!session?.user,
          error,
        })
        
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const storedProfile = loadProfileFromStorage()
          
          if (storedProfile && storedProfile.id === session.user.id) {
            console.log('AuthContext: Using stored profile:', storedProfile)
            setUserProfile(storedProfile)
            setHasRealProfile(true)
            setLastFetchedUserId(session.user.id)
            setLoading(false)
            
            // Background refresh
            timeoutId = setTimeout(async () => {
              try {
                console.log('AuthContext: Refreshing real profile in background')
                const { data, error } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user!.id)
                  .single()
                
                if (data && !error) {
                  console.log('AuthContext: Got refreshed profile, updating:', data)
                  setUserProfile(data)
                  saveProfileToStorage(data)
                }
              } catch (error) {
                console.error('Background profile refresh error:', error)
              }
            }, 500)
          } else {
            console.log('AuthContext: No stored profile, fetching from DB')
            try {
              const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              if (data && !error) {
                console.log('AuthContext: Got real profile:', data)
                setUserProfile(data)
                setHasRealProfile(true)
                saveProfileToStorage(data)
              } else {
                console.log('AuthContext: Could not fetch real profile, using temporary')
                const fallbackProfile = {
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.name || 'User',
                  user_role: getUserRoleFromMetadata(session.user.user_metadata),
                  created_at: new Date().toISOString(),
                  stripe_customer_id: null,
                } as UserProfile
                setUserProfile(fallbackProfile)
                saveProfileToStorage(fallbackProfile)
              }
              setLastFetchedUserId(session.user.id)
            } catch (error) {
              console.error('Error fetching initial profile:', error)
              const fallbackProfile = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || 'User',
                user_role: getUserRoleFromMetadata(session.user.user_metadata),
                created_at: new Date().toISOString(),
                stripe_customer_id: null,
              } as UserProfile
              setUserProfile(fallbackProfile)
              saveProfileToStorage(fallbackProfile)
            }
            setLoading(false)
          }
        } else {
          console.log('AuthContext: Setting loading to false (no session)')
          setLoading(false)
        }
      } catch (error) {
        console.error('AuthContext: Error in getInitialSession:', error)
        setLoading(false)
      }
    }

    getInitialSession()

    // 🔧 Typed callback parameters fix your TS error
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, nextSession: Session | null) => {
        console.log('AuthContext: Auth state changed:', {
          event,
          hasSession: !!nextSession,
          hasUser: !!nextSession?.user,
        })
        
        // If we're signing out, ignore any session restoration
        if (isSigningOutRef.current && event !== 'SIGNED_OUT') {
          console.log('AuthContext: Ignoring auth state change during sign out')
          return
        }

        setSession(nextSession)
        setUser(nextSession?.user ?? null)

        if (nextSession?.user) {
          if (lastFetchedUserId !== nextSession.user.id) {
            console.log('AuthContext: Auth event for new user:', event)

            const storedProfile = loadProfileFromStorage()
            if (storedProfile && storedProfile.id === nextSession.user.id) {
              console.log('AuthContext: Using stored profile for auth event')
              setUserProfile(storedProfile)
              setHasRealProfile(true)
              setLastFetchedUserId(nextSession.user.id)
            } else {
              console.log('AuthContext: No stored profile, fetching from DB for auth event')
              try {
                const { data, error } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', nextSession.user.id)
                  .single()
                
                if (data && !error) {
                  console.log('AuthContext: Got real profile for auth event:', data)
                  setUserProfile(data)
                  setHasRealProfile(true)
                  saveProfileToStorage(data)
                } else {
                  console.log('AuthContext: Could not fetch profile for auth event')
                  const fallbackProfile = {
                    id: nextSession.user.id,
                    email: nextSession.user.email || '',
                    name: nextSession.user.user_metadata?.name || 'User',
                    user_role: getUserRoleFromMetadata(nextSession.user.user_metadata),
                    created_at: new Date().toISOString(),
                    stripe_customer_id: null,
                  } as UserProfile
                  setUserProfile(fallbackProfile)
                  saveProfileToStorage(fallbackProfile)
                }
                setLastFetchedUserId(nextSession.user.id)
              } catch (error) {
                console.error('Error fetching profile in auth change:', error)
                const fallbackProfile = {
                  id: nextSession.user.id,
                  email: nextSession.user.email || '',
                  name: nextSession.user.user_metadata?.name || 'User',
                  user_role: getUserRoleFromMetadata(nextSession.user.user_metadata),
                  created_at: new Date().toISOString(),
                  stripe_customer_id: null,
                } as UserProfile
                setUserProfile(fallbackProfile)
                saveProfileToStorage(fallbackProfile)
                setLastFetchedUserId(nextSession.user.id)
              }
            }
          } else {
            console.log('AuthContext: Auth event for same user, keeping profile')
          }
        } else {
          console.log('AuthContext: User signed out, clearing profile')
          setUserProfile(null)
          setLastFetchedUserId(null)
          setHasRealProfile(false)
          localStorage.removeItem('userProfile')
        }
        
        setLoading(false)
      }
    )

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    loading,
    signOut,
    refreshUserProfile,
    isSigningOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
