// ==============================================================================
// CentralAuth — Core Data Types
// ==============================================================================

export type ClientType = 'public' | 'confidential'
export type EnvironmentType = 'development' | 'staging' | 'production'
export type ApplicationStatus = 'active' | 'suspended' | 'revoked'

export interface OAuthApplication {
  id: string
  client_id: string
  app_name: string
  app_description?: string
  client_type: ClientType
  environment: EnvironmentType
  redirect_uris: string[]
  allowed_scopes: string[]
  status: ApplicationStatus
  contact_email: string
  logo_url?: string
  terms_url?: string
  privacy_url?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface ScopeDefinition {
  id: string
  name: string
  description: string
  category: 'identity' | 'profile' | 'contact' | 'offline' | 'custom'
  isDefault?: boolean
}

export interface SupabaseOAuthAuthorizationDetails {
  authorization_id: string
  client: {
    client_id: string
    client_name: string
    client_uri?: string
    logo_uri?: string
    redirect_uris: string[]
  }
  scope: string
}

export interface UserConsentRecord {
  id: string
  user_id: string
  client_id: string
  granted_scopes: string[]
  granted_at: string
  updated_at: string
  revoked_at?: string
}

export interface AuditLogEntry {
  id: string
  action: string
  actor_id?: string
  target_id?: string
  target_type: string
  details: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface TokenValidationResult {
  valid: boolean
  payload?: {
    iss?: string
    sub?: string
    aud?: string | string[]
    exp?: number
    nbf?: number
    iat?: number
    client_id?: string
    email?: string
    app_metadata?: {
      client_id?: string
      roles?: string[]
      permissions?: string[]
    }
    user_metadata?: Record<string, unknown>
    scope?: string
    [key: string]: unknown
  }
  error?: string
}
