'use client'

import React, { useState } from 'react'
import { History, Shield, Filter, Calendar } from 'lucide-react'

export default function AdminAuditPage() {
  // Demonstration / initial audit trail
  const [logs] = useState([
    {
      id: 'log-1',
      action: 'OAUTH_CLIENT_REGISTERED',
      actor: 'system-admin@centralauth.io',
      target: 'customer-portal-spa-dev',
      target_type: 'oauth_app',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      details: { client_type: 'public', redirect_uri: 'http://localhost:3001/callback', environment: 'development' },
    },
    {
      id: 'log-2',
      action: 'USER_CONSENT_GRANTED',
      actor: 'user-001@example.com',
      target: 'customer-portal-spa-dev',
      target_type: 'oauth_consent',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      details: { scopes: ['openid', 'email', 'profile'], authorization_flow: 'authorization_code_pkce' },
    },
    {
      id: 'log-3',
      action: 'TOKEN_ISSUED_PKCE_S256',
      actor: 'system',
      target: 'customer-portal-spa-dev',
      target_type: 'oauth_token',
      timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      details: { grant_type: 'authorization_code', code_challenge_method: 'S256' },
    },
    {
      id: 'log-4',
      action: 'CONSENT_DENIED',
      actor: 'user-002@example.com',
      target: 'untrusted-client-test',
      target_type: 'oauth_consent',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      details: { reason: 'user_rejected_on_consent_screen' },
    },
  ])

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-6 border-b border-slate-800">
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium mb-1">
          <span>Security & Compliance</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Administrative Audit Logs</h1>
        <p className="text-sm text-slate-400">
          Immutable audit trail of OAuth registrations, consent approvals, and administrative events
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3.5 px-4">Action</th>
              <th className="py-3.5 px-4">Actor</th>
              <th className="py-3.5 px-4">Target Resource</th>
              <th className="py-3.5 px-4">Event Details</th>
              <th className="py-3.5 px-4">Timestamp (UTC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/40 transition">
                <td className="py-3.5 px-4">
                  <span className="font-mono text-indigo-400 font-semibold">{log.action}</span>
                </td>
                <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">{log.actor}</td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                  <span className="text-white">{log.target}</span> ({log.target_type})
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 max-w-[280px]">
                  <pre className="truncate bg-slate-950 p-1.5 rounded border border-slate-800 text-[10px]">
                    {JSON.stringify(log.details)}
                  </pre>
                </td>
                <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
