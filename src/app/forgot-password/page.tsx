'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Shield, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sentSuccess, setSentSuccess] = useState(false)

  const supabase = createClient()

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
      setSentSuccess(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to process password reset request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl mx-auto flex items-center justify-center mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Reset Password</h2>
          <p className="text-sm text-slate-400 mt-1">
            Enter your email to receive a secure password reset link
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {sentSuccess ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="font-semibold text-white">Reset Link Dispatched</h3>
            <p className="text-xs text-slate-300">
              If an account exists with <strong className="text-white">{email}</strong>, you will receive password reset instructions.
            </p>
            <div className="pt-3">
              <Link
                href="/login"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition mt-2"
            >
              {loading ? (
                <span className="text-sm">Sending...</span>
              ) : (
                <>
                  <span className="text-sm">Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <Link href="/login" className="text-xs text-slate-400 hover:text-white transition">
            Remember your credentials? <span className="text-indigo-400">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
