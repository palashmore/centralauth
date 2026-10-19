'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShieldX, AlertTriangle, ArrowLeft } from 'lucide-react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') || 'unknown_error'
  const errorDescription = searchParams.get('error_description')

  const getDetails = (code: string) => {
    switch (code) {
      case 'access_denied':
        return {
          title: 'Access Denied',
          desc: 'You chose not to authorize the application. The request was cancelled safely.',
        }
      case 'invalid_client':
        return {
          title: 'Invalid Client',
          desc: 'The requesting OAuth client is unknown, disabled, or not configured properly.',
        }
      case 'invalid_request':
        return {
          title: 'Invalid OAuth Request',
          desc: 'The request is missing required parameters or violates OAuth 2.1 specifications.',
        }
      case 'unauthorized_client':
        return {
          title: 'Unauthorized Client',
          desc: 'This client is not permitted to request the specified scopes or grant type.',
        }
      default:
        return {
          title: 'Authorization Request Failed',
          desc: errorDescription || 'An error occurred while processing the OAuth authorization request.',
        }
    }
  }

  const details = getDetails(reason)

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl text-center">
      <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-xl mx-auto flex items-center justify-center mb-4">
        <ShieldX className="w-6 h-6" />
      </div>

      <h2 className="text-2xl font-bold text-white tracking-tight">{details.title}</h2>
      <p className="text-sm text-slate-300 mt-2">{details.desc}</p>

      <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-400">
        Code: <span className="text-red-400">{reason}</span>
      </div>

      <div className="mt-8 pt-4 border-t border-slate-800 flex justify-center">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to CentralAuth Portal</span>
        </Link>
      </div>
    </div>
  )
}

export default function OAuthErrorPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading error...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  )
}
