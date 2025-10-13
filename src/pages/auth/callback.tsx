'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../utils/supabaseClient'
import Header from '../../components/ui/Header'
import Icon from '../../components/AppIcon'
import Button from '../../components/ui/Button'

const AuthCallback = () => {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Parse the URL hash for auth tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        if (type === 'signup' && accessToken && refreshToken) {
          // Set the session
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('Error setting session:', error)
            setStatus('error')
            setMessage('Failed to verify your email. Please try signing up again.')
          } else if (data.user) {
            console.log('✅ Email confirmed successfully for user:', data.user.email)
            setStatus('success')
            setMessage('Email confirmed successfully! Redirecting to home page...')
            
            // Redirect after a short delay
            setTimeout(() => {
              router.push('/home-page')
            }, 2000)
          }
        } else {
          // No auth tokens found, redirect to home
          router.push('/home-page')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('An error occurred during email verification.')
      }
    }

    handleAuthCallback()
  }, [router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Icon name="Loader" size={48} className="animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Verifying Email</h1>
            <p className="text-muted-foreground">Please wait while we confirm your account...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <Icon name="CheckCircle" size={48} className="mx-auto mb-4 text-success" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="flex items-center justify-center">
              <Icon name="Loader" size={16} className="animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Redirecting...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <Icon name="AlertCircle" size={48} className="mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Verification Failed</h1>
          <p className="text-muted-foreground mb-6">{message}</p>
          <div className="space-y-3">
            <Button onClick={() => router.push('/auth/signup')} className="w-full">
              Try Signing Up Again
            </Button>
            <Button variant="outline" onClick={() => router.push('/home-page')} className="w-full">
              Go to Home Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthCallback