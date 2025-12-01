import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/ui/Header'
import Button from '../../components/ui/Button'
import Icon from '../../components/AppIcon'
import { createClient } from '../../lib/supabase-browser'

export default function ProfileSettings() {
  const router = useRouter()
  const { user, userProfile, loading } = useAuth()
  const supabase = createClient()
  
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [profilePicture, setProfilePicture] = useState(userProfile?.profile_picture_url || null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        email: user?.email || ''
      })
      setProfilePicture(userProfile.profile_picture_url || null)
    }
  }, [userProfile, user])

  const getInitials = () => {
    const name = userProfile?.name || 'User'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].substring(0, 2).toUpperCase()
  }

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      // Create FormData and upload via API
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/profile/upload-picture', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setUploadError(data.error || 'Upload failed')
        setUploading(false)
        return
      }

      setProfilePicture(data.url)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
    setSuccess(false)
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
    setPasswordError(null)
    setPasswordSuccess(false)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Update user metadata (name)
      const { error: updateError } = await supabase.auth.updateUser({
        data: { name: formData.name }
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      // Update database profile
      const { error: dbError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (dbError) {
        setError(dbError.message)
        return
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setSavingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)

    try {
      // Validate passwords
      if (!passwordData.currentPassword) {
        setPasswordError('Current password is required')
        setSavingPassword(false)
        return
      }

      if (!passwordData.newPassword) {
        setPasswordError('New password is required')
        setSavingPassword(false)
        return
      }

      if (passwordData.newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters')
        setSavingPassword(false)
        return
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New passwords do not match')
        setSavingPassword(false)
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (updateError) {
        setPasswordError(updateError.message)
        return
      }

      setPasswordSuccess(true)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account information and security</p>
          </div>

          {/* Profile Information Section */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white">{getInitials()}</span>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-accent border-2 border-card rounded-full p-2 cursor-pointer hover:bg-primary transition-colors">
                  <Icon name="Camera" size={16} className="text-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{userProfile?.name}</h2>
                <p className="text-sm text-muted-foreground capitalize">{userProfile?.user_role}</p>
                {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
              </div>
            </div>
            {uploadError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
                <Icon name="AlertTriangle" size={18} className="text-destructive" />
                <span className="text-sm text-destructive">{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground/50 focus:outline-none cursor-not-allowed"
                  placeholder="Email cannot be changed"
                />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here. Contact support if you need to update it.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <Icon name="AlertTriangle" size={18} className="text-destructive" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                  <Icon name="CheckCircle" size={18} className="text-green-500" />
                  <span className="text-sm text-green-500">Profile updated successfully!</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={saving}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </div>

          {/* Password Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">Change Password</h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Confirm your new password"
                />
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <Icon name="AlertTriangle" size={18} className="text-destructive" />
                  <span className="text-sm text-destructive">{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                  <Icon name="CheckCircle" size={18} className="text-green-500" />
                  <span className="text-sm text-green-500">Password changed successfully!</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={savingPassword}
                className="w-full"
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
