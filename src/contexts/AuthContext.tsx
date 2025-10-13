'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/router'
import { supabase } from '../utils/supabaseClient'

interface AuthContextType {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: any }>
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    console.log('🔐 [AUTH] AuthProvider initializing...')
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 [AUTH] Initial session:', session ? { user_id: session.user.id, email: session.user.email } : 'null')
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 [AUTH] Auth state changed:', event, session ? { user_id: session.user.id, email: session.user.email } : 'null')
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)

      // Handle sign out - redirect to home page
      if (event === 'SIGNED_OUT') {
        console.log('🔐 [AUTH] User signed out, redirecting to home page')
        router.push('/home-page')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { user: data.user, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { user: data.user, error }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      // The SIGNED_OUT event will be handled by the onAuthStateChange listener
      // which will redirect to home page
    } catch (error) {
      console.error('Error signing out:', error)
      // Fallback redirect in case of error
      router.push('/home-page')
    }
  }

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}