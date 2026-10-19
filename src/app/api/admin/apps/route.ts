// ==============================================================================
// CentralAuth — Admin API: Application Registry Route Handler
// ==============================================================================

import { NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createServerSideClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client or authenticated client to fetch registered applications
    let apps: any[] = []
    try {
      const adminClient = createAdminClient()
      const { data, error } = await adminClient
        .from('oauth_app_registry')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        apps = data
      }
    } catch {
      // Fallback for local mock/dev if service role not set yet
      apps = [
        {
          id: 'demo-app-1',
          client_id: 'sample-client-public-dev',
          app_name: 'Customer Portal SPA',
          app_description: 'Frontend Single Page Application with PKCE',
          client_type: 'public',
          environment: 'development',
          redirect_uris: ['http://localhost:3001/callback'],
          allowed_scopes: ['openid', 'email', 'profile'],
          status: 'active',
          contact_email: 'dev@company.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'demo-app-2',
          client_id: 'enterprise-analytics-confidential-prod',
          app_name: 'Enterprise Analytics Service',
          app_description: 'Confidential server-to-server and web reporting engine',
          client_type: 'confidential',
          environment: 'production',
          redirect_uris: ['https://analytics.company.com/auth/callback'],
          allowed_scopes: ['openid', 'email', 'profile', 'offline_access'],
          status: 'active',
          contact_email: 'ops@company.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
    }

    return NextResponse.json({ apps })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSideClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      client_id,
      app_name,
      app_description,
      client_type,
      environment,
      redirect_uris,
      allowed_scopes,
      contact_email,
    } = body

    if (!client_id || !app_name || !client_type || !environment || !redirect_uris || !contact_email) {
      return NextResponse.json(
        { error: 'Missing mandatory registration fields.' },
        { status: 400 }
      )
    }

    // Persist into oauth_app_registry catalog
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('oauth_app_registry')
      .insert({
        client_id,
        app_name,
        app_description,
        client_type,
        environment,
        redirect_uris,
        allowed_scopes: allowed_scopes || ['openid', 'email', 'profile'],
        contact_email,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log administrative audit entry
    await adminClient.from('audit_logs').insert({
      action: 'REGISTER_OAUTH_APP',
      actor_id: user.id,
      target_id: client_id,
      target_type: 'oauth_app_registry',
      details: {
        app_name,
        client_type,
        environment,
        redirect_uris,
      },
    })

    return NextResponse.json({ app: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to register application' }, { status: 500 })
  }
}
