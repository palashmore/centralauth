'use client'

import React, { useEffect, useState } from 'react'
import {
  LayoutGrid,
  Plus,
  Shield,
  Layers,
  Key,
  Globe,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
} from 'lucide-react'
import { OAuthApplication } from '@/lib/types/auth'

export default function AdminAppsPage() {
  const [apps, setApps] = useState<OAuthApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState('')
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form State
  const [clientId, setClientId] = useState('')
  const [appName, setAppName] = useState('')
  const [appDescription, setAppDescription] = useState('')
  const [clientType, setClientType] = useState<'public' | 'confidential'>('public')
  const [environment, setEnvironment] = useState<'development' | 'staging' | 'production'>('development')
  const [redirectUrisInput, setRedirectUrisInput] = useState('')
  const [allowedScopesInput, setAllowedScopesInput] = useState('openid email profile')
  const [contactEmail, setContactEmail] = useState('')

  useEffect(() => {
    fetchApps()
  }, [])

  const fetchApps = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/apps')
      const data = await res.json()
      if (data.apps) {
        setApps(data.apps)
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to load registered applications' })
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterApp = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMsg(null)

    const uris = redirectUrisInput
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean)

    const scopes = allowedScopesInput
      .split(/\s+|,/)
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      const res = await fetch('/api/admin/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          app_name: appName,
          app_description: appDescription,
          client_type: clientType,
          environment,
          redirect_uris: uris,
          allowed_scopes: scopes,
          contact_email: contactEmail,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Registration failed')

      setStatusMsg({
        type: 'success',
        text: `Application '${appName}' catalog entry created. Ensure client is registered in Supabase Dashboard (Auth > OAuth Apps).`,
      })
      setShowAddModal(false)
      fetchApps()
      // Reset form
      setClientId('')
      setAppName('')
      setAppDescription('')
      setRedirectUrisInput('')
      setContactEmail('')
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message })
    }
  }

  const filteredApps = apps.filter(
    (app) =>
      app.app_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.client_id?.toLowerCase().includes(search.toLowerCase()) ||
      app.environment?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium mb-1">
            <span>Identity Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OAuth 2.1 Application Registry</h1>
          <p className="text-sm text-slate-400">
            Registered OAuth clients, environment mappings, and allowed scope configurations
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Client</span>
        </button>
      </div>

      {/* Critical Security Callout */}
      <div className="p-4 bg-slate-900 border border-indigo-500/30 rounded-2xl flex items-start space-x-3 text-xs text-slate-300">
        <Lock className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white block font-medium">Internal Catalog vs Supabase Auth Server Sync</strong>
          <p className="text-slate-400">
            This internal catalog tracks application lifecycle, contact owners, and environment policy.
            Actual client secrets and cryptographic credentials reside strictly on the Supabase OAuth Server
            (<strong>Authentication &gt; OAuth Apps</strong>). Never store plaintext client secrets in application database tables.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center space-x-2 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center space-x-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client ID, name, environment..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing {filteredApps.length} registered {filteredApps.length === 1 ? 'client' : 'clients'}
        </div>
      </div>

      {/* Apps Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Application</th>
                <th className="py-3.5 px-4">Client ID</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Environment</th>
                <th className="py-3.5 px-4">Redirect URIs</th>
                <th className="py-3.5 px-4">Allowed Scopes</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading registered applications...
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No applications found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id || app.client_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div>{app.app_name}</div>
                      {app.app_description && (
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                          {app.app_description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-300 select-all">
                      {app.client_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                          app.client_type === 'public'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}
                      >
                        {app.client_type === 'public' ? 'Public (PKCE)' : 'Confidential'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                          app.environment === 'production'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : app.environment === 'staging'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {app.environment}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-[220px]">
                      <div className="space-y-1">
                        {app.redirect_uris?.map((uri, idx) => (
                          <div key={idx} className="font-mono text-[10px] text-slate-400 truncate" title={uri}>
                            {uri}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {app.allowed_scopes?.map((sc) => (
                          <span
                            key={sc}
                            className="px-1.5 py-0.5 rounded bg-slate-950 text-indigo-300 font-mono text-[10px] border border-slate-800"
                          >
                            {sc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="capitalize">{app.status || 'Active'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Register Application Metadata</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterApp} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Application Name *</label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. Analytics Portal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Unique Client ID *</label>
                <input
                  type="text"
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="e.g. analytics-portal-spa-dev"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Client Type *</label>
                  <select
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="public">Public (SPA / Mobile with PKCE)</option>
                    <option value="confidential">Confidential (Server Web App)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Environment *</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Exact Redirect URIs (one per line, no wildcards) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={redirectUrisInput}
                  onChange={(e) => setRedirectUrisInput(e.target.value)}
                  placeholder="http://localhost:3001/callback&#10;https://app.company.com/oauth/callback"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Allowed Scopes *</label>
                <input
                  type="text"
                  required
                  value={allowedScopesInput}
                  onChange={(e) => setAllowedScopesInput(e.target.value)}
                  placeholder="openid email profile"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Contact / Owner Email *</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="lead-dev@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
