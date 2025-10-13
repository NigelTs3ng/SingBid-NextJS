"use client";
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AuthForm from '@/components/AuthForm'

export default function LoginPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <AuthForm
        mode="login"
        onSubmit={async (email, password) => {
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          router.push('/home-page')
        }}
      />
    </div>
  )
}


