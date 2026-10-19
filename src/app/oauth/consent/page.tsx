'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Lock,
  ExternalLink,
  User,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { parseScopes } from '@/lib/oauth/scopes'
import { ScopeDefinition } from '@/lib/types/auth'

function ConsentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authorizationId = searchParams.get('authorization_id')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'deny' | null>(null)
  const [user, setUser] = useState<any>(null)
  const [clientDetails, setClientDetails] = useState<any>(null)
  const [scopes, setScopes] = useState<ScopeDefinition[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function init() {
      if (!authorizationId) {
        setErrorMsg('Invalid authorization request: Missing "authorization_id" parameter.')
        setLoading(false)
        return
      }

      // 1. Verify user session
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) {
        // Preserve authorization request during authentication
        router.push(`/login?authorization_id=${encodeURIComponent(authorizationId)}`)
        return
      }

      setUser(currentUser)

      // 2. Fetch authorization request details from Supabase OAuth Server
      try {
        const { data, error } = await (supabase.auth as any).oauth.getAuthorizationDetails(
          authorizationId
        )

        if (error) {
          setErrorMsg(error.message || 'The authorization request is invalid, expired, or has already been processed.')
          setLoading(false)
          return
        }

        // Check if Supabase returned an immediate redirect (e.g., prior consent)
        if (data?.redirect_url) {
          window.location.href = data.redirect_url
          return
        }

        setClientDetails(data?.client || null)
        setScopes(parseScopes(data?.scope || ''))
      } catch (err: any) {
        setErrorMsg('An unexpected error occurred while loading authorization details.')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [authorizationId, router])

  const handleApprove = async () => {
    if (!authorizationId || submitting) return
    setSubmitting(true)
    setActionType('approve')
    setErrorMsg(null)

    try {
      const { data, error } = await (supabase.auth as any).oauth.approveAuthorization(
        authorizationId
      )

      if (error) {
        setErrorMsg(error.message || 'Failed to authorize application.')
        setSubmitting(false)
        return
      }

      if (data?.redirect_url) {
        // Enforce redirection ONLY to the validated redirect_url returned by Supabase
        window.location.href = data.redirect_url
      } else {
        setErrorMsg('Authorization succeeded, but no redirect URL was returned.')
        setSubmitting(false)
      }
    } catch (err: any) {
      setErrorMsg('Failed to process approval. Please try again.')
      setSubmitting(false)
    }
  }

  const handleDeny = async () => {
    if (!authorizationId || submitting) return
    setSubmitting(true)
    setActionType('deny')
    setErrorMsg(null)

    try {
      const { data, error } = await (supabase.auth as any).oauth.denyAuthorization(
        authorizationId
      )

      if (error) {
        setErrorMsg(error.message || 'Failed to reject authorization request.')
        setSubmitting(false)
        return
      }

      if (data?.redirect_url) {
        // Redirect client with standard access_denied OAuth response
        window.location.href = data.redirect_url
      } else {
        router.push('/oauth/error?reason=access_denied')
      }
    } catch (err: any) {
      setErrorMsg('Failed to process rejection.')
      setSubmitting(false)
    }
  }

  // Handle Loading State
  if (loading) {
    return (
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-white">Verifying Authorization Request</h3>
        <p className="text-xs text-slate-400 mt-1">Retrieving application metadata and requested permissions...</p>
      </div>
    )
  }

  // Handle Error State
  if (errorMsg && !clientDetails) {
    return (
      <div className="w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-xl mx-auto flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Authorization Error</h2>
        <p className="text-sm text-slate-300 mt-2">{errorMsg}</p>
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 rounded-xl transition"
          >
            Return to Home
          </Link>
          <Link
            href="/account"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm text-white rounded-xl transition"
          >
            Go to Account
          </Link>
        </div>
      </div>
    )
  }

  const clientName = clientDetails?.client_name || 'Third-Party Application'
  const clientUri = clientDetails?.client_uri
  const logoUri = clientDetails?.logo_uri

  return (
    <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
      {/* Header & Client Identification */}
      <div className="text-center pb-6 border-b border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mx-auto flex items-center justify-center mb-4 overflow-hidden shadow-inner">
          {logoUri ? (
            <img src={logoUri} alt={clientName} className="w-full h-full object-cover" />
          ) : (
            <Lock className="w-8 h-8 text-indigo-400" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight">
          Authorize <span className="text-indigo-400">{clientName}</span>
        </h2>

        {clientUri && (
          <a
            href={clientUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-indigo-300 mt-1 transition"
          >
            <span>{clientUri}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        <p className="text-xs text-slate-400 mt-2">
          is requesting permission to access your CentralAuth account.
        </p>
      </div>

      {/* Authenticated User Banner */}
      <div className="my-4 px-3.5 py-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <User className="w-4 h-4 text-indigo-400" />
          <span>Signed in as <strong className="text-white">{user?.email}</strong></span>
        </div>
        <Link
          href={`/login?authorization_id=${encodeURIComponent(authorizationId || '')}`}
          className="text-indigo-400 hover:text-indigo-300 font-medium transition"
        >
          Switch account
        </Link>
      </div>

      {/* Error alert inside form */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Permissions & Scopes List */}
      <div className="py-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>Permissions Requested</span>
        </h4>

        <div className="space-y-2.5">
          {scopes.length > 0 ? (
            scopes.map((scope) => (
              <div
                key={scope.id}
                className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start space-x-3 text-left"
              >
                <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">{scope.name}</div>
                  <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                    {scope.description}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 italic p-3 bg-slate-950 rounded-xl">
              Basic account authentication and identification.
            </div>
          )}
        </div>
      </div>

      <div className="text-[11px] text-slate-500 py-3 text-center">
        By clicking Authorize, you allow this application to access the requested data according to CentralAuth terms.
      </div>

      {/* Action Buttons: Authorize vs Cancel */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={handleDeny}
          disabled={submitting}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-sm transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
        >
          <XCircle className="w-4 h-4 text-slate-400" />
          <span>{submitting && actionType === 'deny' ? 'Canceling...' : 'Cancel'}</span>
        </button>

        <button
          type="button"
          onClick={handleApprove}
          disabled={submitting}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4 text-white" />
          <span>{submitting && actionType === 'approve' ? 'Authorizing...' : 'Authorize'}</span>
        </button>
      </div>
    </div>
  )
}

export default function OAuthConsentPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading consent screen...</div>}>
        <ConsentContent />
      </Suspense>
    </div>
  )
}
