// ==============================================================================
// CentralAuth — Supported OAuth 2.1 & OpenID Connect Scopes
// ==============================================================================

import { ScopeDefinition } from '../types/auth'

export const SUPPORTED_SCOPES: Record<string, ScopeDefinition> = {
  openid: {
    id: 'openid',
    name: 'OpenID Connect Identity',
    description: 'Verify your unique identity and issue an OpenID Connect ID token.',
    category: 'identity',
    isDefault: true,
  },
  email: {
    id: 'email',
    name: 'Email Address',
    description: 'Access your primary email address and email verification status.',
    category: 'contact',
    isDefault: true,
  },
  profile: {
    id: 'profile',
    name: 'Basic Profile',
    description: 'Access your public profile details, display name, and avatar.',
    category: 'profile',
    isDefault: true,
  },
  phone: {
    id: 'phone',
    name: 'Phone Number',
    description: 'Access your verified phone number (if registered).',
    category: 'contact',
    isDefault: false,
  },
  offline_access: {
    id: 'offline_access',
    name: 'Offline Access / Refresh Token',
    description: 'Allow the application to perform actions while you are not actively using it.',
    category: 'offline',
    isDefault: false,
  },
}

/**
 * Parses space-delimited OAuth scope string and returns rich metadata
 */
export function parseScopes(scopeString?: string): ScopeDefinition[] {
  if (!scopeString || typeof scopeString !== 'string') {
    return []
  }

  const tokens = scopeString.trim().split(/\s+/).filter(Boolean)

  return tokens.map((token) => {
    if (SUPPORTED_SCOPES[token]) {
      return SUPPORTED_SCOPES[token]
    }
    return {
      id: token,
      name: `Custom Scope (${token})`,
      description: `Application-requested scope permission: ${token}`,
      category: 'custom',
    }
  })
}
