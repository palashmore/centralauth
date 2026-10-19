-- ==============================================================================
-- CentralAuth - Central OAuth 2.1 Identity Provider Schema & Migrations
-- Schema version: 20260101000000_central_auth_schema.sql
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. OAuth Internal Application Registry
--    Maintains metadata, environment mapping, contact, and audit details
--    synchronized with registered Supabase OAuth clients.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.oauth_app_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id TEXT NOT NULL UNIQUE,
    app_name TEXT NOT NULL,
    app_description TEXT,
    client_type TEXT NOT NULL CHECK (client_type IN ('public', 'confidential')),
    environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
    redirect_uris TEXT[] NOT NULL DEFAULT '{}',
    allowed_scopes TEXT[] NOT NULL DEFAULT '{openid,email,profile}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
    contact_email TEXT NOT NULL,
    logo_url TEXT,
    terms_url TEXT,
    privacy_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_app_registry_client_id ON public.oauth_app_registry(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_app_registry_env ON public.oauth_app_registry(environment);
CREATE INDEX IF NOT EXISTS idx_oauth_app_registry_status ON public.oauth_app_registry(status);

-- ------------------------------------------------------------------------------
-- 2. User Consents Table
--    Records explicit user grant history for each OAuth client & scope set.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.oauth_user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    granted_scopes TEXT[] NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    revoked_at TIMESTAMPTZ,
    UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user_consents_user ON public.oauth_user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_user_consents_client ON public.oauth_user_consents(client_id);

-- ------------------------------------------------------------------------------
-- 3. Application Roles (Client-specific RBAC)
--    Enforces application isolation: scopes do NOT grant resource access.
--    Authoritative application roles are defined and assigned here.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id TEXT NOT NULL REFERENCES public.oauth_app_registry(client_id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    description TEXT,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(client_id, role_name)
);

CREATE TABLE IF NOT EXISTS public.user_application_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES public.oauth_app_registry(client_id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(user_id, client_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_user_app_roles_lookup ON public.user_application_roles(user_id, client_id);

-- ------------------------------------------------------------------------------
-- 4. Central Audit Logging
--    Tracks administrative operations, client registration changes, and revocations.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_id TEXT,
    target_type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.oauth_app_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_application_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Is the current user a CentralAuth Platform Administrator?
CREATE OR REPLACE FUNCTION public.is_centralauth_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  );
$$;

-- RLS: oauth_app_registry
-- Read: Active apps can be viewed by authenticated users (needed for consent display)
CREATE POLICY "Allow authenticated users to read active apps"
    ON public.oauth_app_registry
    FOR SELECT
    TO authenticated
    USING (status = 'active' OR public.is_centralauth_admin());

-- Modify: Only platform admins can insert, update, delete
CREATE POLICY "Admins full management of app registry"
    ON public.oauth_app_registry
    FOR ALL
    TO authenticated
    USING (public.is_centralauth_admin())
    WITH CHECK (public.is_centralauth_admin());

-- Service role bypass for backend server calls
CREATE POLICY "Service role full access to app registry"
    ON public.oauth_app_registry
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS: oauth_user_consents
-- Users can view and revoke their own consents
CREATE POLICY "Users can view their own consents"
    ON public.oauth_user_consents
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update or revoke their own consents"
    ON public.oauth_user_consents
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consent"
    ON public.oauth_user_consents
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to user consents"
    ON public.oauth_user_consents
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS: application_roles
CREATE POLICY "Authenticated users can read application roles"
    ON public.application_roles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins manage application roles"
    ON public.application_roles
    FOR ALL
    TO authenticated
    USING (public.is_centralauth_admin())
    WITH CHECK (public.is_centralauth_admin());

CREATE POLICY "Service role full access to application roles"
    ON public.application_roles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS: user_application_roles
CREATE POLICY "Users can view their own application roles"
    ON public.user_application_roles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_centralauth_admin());

CREATE POLICY "Admins manage user application roles"
    ON public.user_application_roles
    FOR ALL
    TO authenticated
    USING (public.is_centralauth_admin())
    WITH CHECK (public.is_centralauth_admin());

CREATE POLICY "Service role full access to user application roles"
    ON public.user_application_roles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS: audit_logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (public.is_centralauth_admin());

CREATE POLICY "Service role can manage audit logs"
    ON public.audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. Supabase Custom Access Token Hook (PL/pgSQL)
--    Injects client-specific roles and permissions into issued access tokens.
--    This ensures application-specific isolation without trusting client-side claims.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims jsonb;
    client_id text;
    user_id uuid;
    assigned_roles text[];
    assigned_permissions text[];
BEGIN
    claims := event->'claims';
    user_id := (event->>'user_id')::uuid;
    client_id := event->>'client_id';

    -- If this token is issued in an OAuth context for a specific registered client:
    IF client_id IS NOT NULL THEN
        -- Query authoritative roles for this user and this specific client
        SELECT array_agg(uar.role_name)
        INTO assigned_roles
        FROM public.user_application_roles uar
        WHERE uar.user_id = user_id
          AND uar.client_id = client_id;

        -- Query distinct permissions for these roles
        SELECT array_agg(DISTINCT p)
        FROM (
            SELECT unnest(ar.permissions) as p
            FROM public.application_roles ar
            WHERE ar.client_id = client_id
              AND ar.role_name = ANY(COALESCE(assigned_roles, '{}'))
        ) sub
        INTO assigned_permissions;

        -- Inject client-isolated authorization claims
        claims := jsonb_set(claims, '{app_metadata, client_id}', to_jsonb(client_id));
        claims := jsonb_set(claims, '{app_metadata, roles}', to_jsonb(COALESCE(assigned_roles, '{}'::text[])));
        claims := jsonb_set(claims, '{app_metadata, permissions}', to_jsonb(COALESCE(assigned_permissions, '{}'::text[])));
    END IF;

    -- Return the modified event with augmented claims
    RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execution permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;
