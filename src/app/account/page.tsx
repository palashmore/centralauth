'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Shield,
  Key,
  Clock,
  Layers,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [consents, setConsents] = useState<any[]>([])
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadAccount() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push('/login?return_to=/account')
        return
      }

      setUser(currentUser)

      // Query active user consents if table exists
      try {
        const { data, error } = await supabase
          .from('oauth_user_consents')
          .select('*')
          .eq('user_id', currentUser.id)
          .is('revoked_at', null)

        if (!error && data) {
          setConsents(data)
        }
      } catch {
        // Ignored if table not populated in local dev yet
      } finally {
        setLoading(false)
      }
    }

    loadAccount()
  }, [router])

  const handleRevokeConsent = async (consentId: string, clientId: string) => {
    setRevokingId(consentId)
    setMsg(null)

    try {
      const { error } = await supabase
        .from('oauth_user_consents')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', consentId)

      if (error) throw error

      setConsents((prev) => prev.filter((c) => c.id !== consentId))
      setMsg({ type: 'success', text: `Access revoked for application '${clientId}'.` })
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Failed to revoke application access.' })
    } finally {
      setRevokingId(null)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-slate-400 text-sm">Loading user account...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Identity & Account</h1>
          <p className="text-sm text-slate-400">Manage your profile, security, and authorized applications</p>
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center space-x-2 border ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* User Information Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Central Identity Details</h2>
            <p className="text-xs text-slate-400">Authoritative profile managed in CentralAuth Supabase</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Email Address</span>
            <span className="text-white font-medium text-sm">{user?.email}</span>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Central User ID (sub)</span>
            <span className="text-indigo-300 font-mono text-xs select-all">{user?.id}</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Account Created</span>
            <span className="text-slate-200">
              {user?.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Last Sign In</span>
            <span className="text-slate-200">
              {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Current session'}
            </span>
          </div>
        </div>
      </div>

      {/* Connected Applications / Consents */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Authorized Third-Party Applications</h2>
              <p className="text-xs text-slate-400">Applications you have granted OAuth access to</p>
            </div>
          </div>
        </div>

        {consents.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-xs text-slate-400">
            No external applications currently hold active consent tokens for your account.
          </div>
        ) : (
          <div className="space-y-3">
            {consents.map((consent) => (
              <div
                key={consent.id}
                className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="font-semibold text-sm text-white">{consent.client_id}</div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-1">
                    Scopes:{' '}
                    {consent.granted_scopes?.map((s: string) => (
                      <span
                        key={s}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Granted: {new Date(consent.granted_at).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={() => handleRevokeConsent(consent.id, consent.client_id)}
                  disabled={revokingId === consent.id}
                  className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs font-medium transition flex items-center space-x-1.5 self-start sm:self-auto disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{revokingId === consent.id ? 'Revoking...' : 'Revoke Access'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Security & Password</h2>
            <p className="text-xs text-slate-400">Rotate your master password or manage authentication tokens</p>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex items-center space-x-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl border border-slate-700 transition"
          >
            <span>Change or Reset Password</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  )
}
