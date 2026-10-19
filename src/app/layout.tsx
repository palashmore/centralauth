import './globals.css'
import type { Metadata } from 'next'
import Navbar from '../components/Navbar'

export const metadata: Metadata = {
  title: 'CentralAuth — Central OAuth 2.1 Identity Provider',
  description: 'Enterprise OAuth 2.1 & OpenID Connect Centralized Authorization Server built on Supabase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>CentralAuth • OAuth 2.1 & OpenID Connect Authorization Server</div>
            <div className="flex gap-4">
              <span className="text-slate-400">Strict Isolation</span>
              <span>•</span>
              <span className="text-slate-400">PKCE S256</span>
              <span>•</span>
              <span className="text-slate-400">No Secret In Frontend</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
