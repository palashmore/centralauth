'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shield, User, LogOut, KeyRound, LayoutGrid, Users, History } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-lg tracking-tight">CentralAuth</span>
              <span className="text-[10px] text-indigo-400 font-mono -mt-1 uppercase tracking-wider">OAuth 2.1 IdP</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1 pl-6">
            <Link
              href="/admin/apps"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white rounded-md hover:bg-slate-800 transition"
            >
              <LayoutGrid className="w-4 h-4 text-slate-400" />
              <span>Apps Registry</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white rounded-md hover:bg-slate-800 transition"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>Users</span>
            </Link>
            <Link
              href="/admin/audit"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white rounded-md hover:bg-slate-800 transition"
            >
              <History className="w-4 h-4 text-slate-400" />
              <span>Audit Logs</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <Link
                href="/account"
                className="flex items-center space-x-2 text-sm text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
              >
                <User className="w-4 h-4 text-indigo-400" />
                <span className="max-w-[140px] truncate">{user.email}</span>
              </Link>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3.5 py-1.5 rounded-lg shadow-sm transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
