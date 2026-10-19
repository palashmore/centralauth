// ==============================================================================
// CentralAuth — Privileged Server-Side Admin Client (Service Role)
// ==============================================================================

import { createClient } from '@supabase/supabase-js'

/**
 * Creates a privileged administrative Supabase client using the service role key.
 *
 * CRITICAL SECURITY INVARIANT:
 * - This function MUST ONLY be called from server-side Node.js environments (Route Handlers, Server Actions).
 * - NEVER import or execute this module in client components or browser context.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      'CRITICAL CONFIGURATION ERROR: SUPABASE_SERVICE_ROLE_KEY is not defined. Privileged admin operations require a server-side service role key.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
