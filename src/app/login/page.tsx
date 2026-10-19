'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authorizationId = searchParams.get('authorization_id')
  const returnTo = searchParams.get('return_to')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isMagicLink, setIsMagicLink] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: authorizationId
              ? `${window.location.origin}/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`
              : `${window.location.origin}/account`,
          },
        })

        if (error) throw error
        setSuccessMsg('Magic link sent! Check your email to complete sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // If there is a pending authorization_id, return immediately to consent flow
        if (authorizationId) {
          router.push(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`)
        } else if (returnTo) {
          router.push(returnTo)
        } else {
          router.push('/account')
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl mx-auto flex items-center justify-center mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">CentralAuth Sign In</h2>
        <p className="text-sm text-slate-400 mt-1">
          {authorizationId
            ? 'Sign in to authorize third-party application access'
            : 'Access your unified account and registered applications'}
        </p>

        {authorizationId && (
          <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs font-mono">
            <span>Pending OAuth Consent: {authorizationId.slice(0, 12)}...</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start space-x-3 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        {!isMagicLink && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition mt-2"
        >
          {loading ? (
            <span className="text-sm">Authenticating...</span>
          ) : (
            <>
              <span className="text-sm">{isMagicLink ? 'Send Magic Link' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setIsMagicLink(!isMagicLink)
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className="text-xs text-slate-400 hover:text-indigo-300 underline underline-offset-4 transition"
          >
            {isMagicLink ? 'Sign in with Password instead' : 'Sign in with Passwordless Magic Link'}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link
            href={
              authorizationId
                ? `/register?authorization_id=${encodeURIComponent(authorizationId)}`
                : '/register'
            }
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading sign-in...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
