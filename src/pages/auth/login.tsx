'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/ui/Header'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Icon from '../../components/AppIcon'

const Login = () => {
  const router = useRouter()
  const { signIn, isAuthenticated, isLoading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      const { user, error } = await signIn(formData.email, formData.password)
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ submit: 'Invalid email or password' })
        } else {
          setErrors({ submit: error.message })
        }
      } else if (user) {
        const redirect = router.query.redirect as string
        router.push(redirect || '/home-page')
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'An error occurred during login' })
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <Icon name="User" size={48} className="mx-auto mb-4 text-primary" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">Sign in to your SingBid account</p>
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
                  placeholder="Enter your password"
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
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Don't have an account?{' '}
                <Link 
                  href="/auth/signup" 
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login