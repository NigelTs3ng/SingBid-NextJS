'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/ui/Header'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Icon from '../../components/AppIcon'

const Signup = () => {
  const router = useRouter()
  const { signUp, isAuthenticated, isLoading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const redirect = router.query.redirect as string
      router.push(redirect || '/home-page')
    }
  }, [isAuthenticated, isLoading, router])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    setErrors({})
    
    try {
      const { user, error } = await signUp(formData.email, formData.password)
      
      if (error) {
        if (error.message.includes('User already registered')) {
          setErrors({ submit: 'An account with this email already exists' })
        } else {
          setErrors({ submit: error.message })
        }
      } else if (user) {
        setShowSuccess(true)
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'An error occurred during signup' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Icon name="Loader" size={32} className="animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="w-full max-w-md">
            <div className="bg-card rounded-lg shadow-lg p-8 text-center">
              <Icon name="CheckCircle" size={48} className="mx-auto mb-4 text-success" />
              <h1 className="text-2xl font-bold text-foreground mb-4">Account Created!</h1>
              <p className="text-muted-foreground mb-6">
                Please check your email and click the confirmation link to activate your account.
              </p>
              <Button onClick={() => router.push('/auth/login')}>
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <Icon name="UserPlus" size={48} className="mx-auto mb-4 text-primary" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Create Account</h1>
              <p className="text-muted-foreground">Join SingBid and start bidding</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <Input
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  error={errors.password}
                  placeholder="Create a password"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 6 characters long
                </p>
              </div>

              <div>
                <Input
                  label="Confirm Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  error={errors.confirmPassword}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {errors.submit && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <div className="flex items-center space-x-2">
                    <Icon name="AlertCircle" size={16} className="text-destructive" />
                    <p className="text-sm text-destructive">{errors.submit}</p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                iconName={isSubmitting ? "Loader" : undefined}
                iconClassName={isSubmitting ? "animate-spin" : undefined}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  href="/auth/login" 
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup