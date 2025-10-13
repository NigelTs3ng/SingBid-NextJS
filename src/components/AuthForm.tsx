"use client";
import React, { useState } from 'react'

type Props = {
  mode: 'login' | 'signup'
  onSubmit: (email: string, password: string) => Promise<void>
}

export default function AuthForm({ mode, onSubmit }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit(email, password)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{mode === 'login' ? 'Login' : 'Create account'}</h1>
      {error ? <p className="text-red-500 text-sm">{error}</p> : null}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded px-3 py-2"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border rounded px-3 py-2"
        required
      />
      <button disabled={loading} className="w-full bg-black text-white rounded px-3 py-2">
        {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Sign up'}
      </button>
    </form>
  )
}


