'use client'

import React from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  KeyRound,
  Layers,
  ArrowRight,
  Server,
  Lock,
  FileCode2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-center">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-slate-900 bg-gradient-to-b from-indigo-950/20 via-slate-950 to-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Production-Grade OAuth 2.1 & OpenID Connect IdP</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Centralized Identity. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              Zero-Trust Application Isolation.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-slate-400">
            <strong>CentralAuth</strong> provides unified authentication, authorization, and single identity
            for multiple independent applications without duplicating user credentials or compromising client boundaries.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/admin/apps"
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/25 transition"
            >
              <span>Manage Application Registry</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-6 py-3 rounded-xl border border-slate-700 transition"
            >
              <span>Identity Portal Sign In</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 text-center mb-2">
          Architecture & Standards
        </h2>
        <p className="text-2xl font-bold text-white text-center mb-12">
          Enterprise Security Built on Supabase OAuth Server
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">OAuth 2.1 & PKCE S256</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Strict compliance with OAuth 2.1 draft specifications. Authorization Code flow strictly paired with
              S256 PKCE challenges. Deprecated implicit and password grants are fully prohibited.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Independent Client Registrations</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Consuming applications receive dedicated Client IDs, independent redirect URIs, and isolated scope policies
              for Development, Staging, and Production environments.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Asymmetric Token Verification</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              JWTs signed via asymmetric keys (RS256 / ES256). Independent consuming resource servers validate
              signatures via standard public JWKS endpoints without sharing service-role keys.
            </p>
          </div>
        </div>
      </section>

      {/* Protocol Endpoints Status Card */}
      <section className="pb-16 max-w-4xl mx-auto px-4 w-full">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-white">Standard IdP Endpoints</h3>
            </div>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono">
              OAuth 2.1 Ready
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Consent Screen:</span>
              <span className="text-indigo-300">/oauth/consent</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Authorization Endpoint:</span>
              <span className="text-slate-300">https://&lt;project&gt;.supabase.co/auth/v1/oauth/authorize</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Token Exchange:</span>
              <span className="text-slate-300">https://&lt;project&gt;.supabase.co/auth/v1/oauth/token</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">JWKS Endpoint:</span>
              <span className="text-slate-300">https://&lt;project&gt;.supabase.co/auth/v1/.well-known/jwks.json</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">OpenID Discovery:</span>
              <span className="text-slate-300">https://&lt;project&gt;.supabase.co/auth/v1/.well-known/openid-configuration</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
