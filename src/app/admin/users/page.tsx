'use client'

import React, { useEffect, useState } from 'react'
import { Users, Search, ShieldCheck, Mail, Calendar, CheckCircle2, XCircle } from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (data.users) {
        setUsers(data.users)
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.id?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-6 border-b border-slate-800">
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium mb-1">
          <span>Identity Directory</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Central User Management</h1>
        <p className="text-sm text-slate-400">
          Global user identities managed by the central Supabase Auth service
        </p>
      </div>

      <div className="flex items-center space-x-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by email or UUID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3.5 px-4">User Email</th>
              <th className="py-3.5 px-4">User ID (sub)</th>
              <th className="py-3.5 px-4">Email Status</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Created Date</th>
              <th className="py-3.5 px-4">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Loading users directory...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-medium text-white flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{user.email}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-300 select-all">
                    {user.id}
                  </td>
                  <td className="py-3.5 px-4">
                    {user.email_confirmed_at ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <XCircle className="w-3 h-3" />
                        <span>Unverified</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                      {user.is_admin ? 'Admin' : 'Standard User'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
