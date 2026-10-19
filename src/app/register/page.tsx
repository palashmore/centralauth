'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authorizationId = searchParams.get('authorization_id')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [registeredSuccess, setRegisteredSuccess] = useState(false)

  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters in length.')
      setLoading(false)
      return
    }

    try {
      const emailRedirectTo = authorizationId
        ? `${window.location.origin}/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`
        : `${window.location.origin}/account`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo,
        },
      })

      if (error) throw error

      // If user session is immediate (email confirmation turned off in development):
      if (data.session) {
        if (authorizationId) {
          router.push(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`)
        } else {
          router.push('/account')
        }
      } else {
        // Email verification required
        setRegisteredSuccess(true)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (registeredSuccess) {
    return (
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl text-center">
        <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl mx-auto flex items-center justify-center mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Check Your Email</h2>
        <p className="text-sm text-slate-300 mt-2">
          We have sent a verification confirmation link to <strong className="text-white">{email}</strong>.
        </p>
        <p className="text-xs text-slate-400 mt-4">
          Please click the link in your email to verify your identity and activate your account.
        </p>
        <div className="mt-8">
          <Link
            href={
              authorizationId
                ? `/login?authorization_id=${encodeURIComponent(authorizationId)}`
                : '/login'
            }
            className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 font-medium"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl mx-auto flex items-center justify-center mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Create CentralAuth Account</h2>
        <p className="text-sm text-slate-400 mt-1">
          A single account for all authorized ecosystem applications
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Morgan"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition mt-2"
        >
          {loading ? (
            <span className="text-sm">Creating Account...</span>
          ) : (
            <>
              <span className="text-sm">Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-400">
          Already have an account?{' '}
          <Link
            href={
              authorizationId
                ? `/login?authorization_id=${encodeURIComponent(authorizationId)}`
                : '/login'
            }
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading registration...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  )
}
