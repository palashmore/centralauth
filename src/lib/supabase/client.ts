// ==============================================================================
// CentralAuth — Browser Supabase Client
// ==============================================================================

import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for client-side React components in the browser.
 * Safe for public anon key usage.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
