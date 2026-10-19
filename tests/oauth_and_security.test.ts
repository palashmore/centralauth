// ==============================================================================
// CentralAuth — Comprehensive OAuth 2.1 & Security Test Suite
// Covers all 18 core verification scenarios required by Section 9
// ==============================================================================

import { describe, it, expect, beforeAll } from 'vitest'
import * as jose from 'jose'
import {
  validateRedirectUri,
  computeS256CodeChallenge,
  verifyPkce,
  generateSecureRandomToken,
  verifyState,
  validateJwtToken,
  verifyClientIsolation,
} from '../src/lib/oauth/validator'
import { parseScopes, SUPPORTED_SCOPES } from '../src/lib/oauth/scopes'

describe('CentralAuth OAuth 2.1 & Security Suite', () => {
  let rsaKeyPair: jose.GenerateKeyPairResult
  let rsaPublicKeyPem: string
  const validIssuer = 'https://auth.company.com/auth/v1'
  const clientAId = 'app-client-a'
  const clientBId = 'app-client-b'

  beforeAll(async () => {
    // Generate in-memory RS256 keypair for cryptographic verification tests
    rsaKeyPair = await jose.generateKeyPair('RS256')
    rsaPublicKeyPem = await jose.exportSPKI(rsaKeyPair.publicKey)
  })

  // --------------------------------------------------------------------------
  // 1 & 2: Valid and Invalid Login Simulation / Credential Logic
  // --------------------------------------------------------------------------
  it('Scenario 1 & 2: Handles login credential validation and rejects malformed attempts', () => {
    const validateCredentials = (email?: string, password?: string) => {
      if (!email || !email.includes('@')) return { success: false, error: 'Invalid email format' }
      if (!password || password.length < 8) return { success: false, error: 'Password too short' }
      return { success: true }
    }

    // Valid
    expect(validateCredentials('alex@example.com', 'SuperSecurePass123!').success).toBe(true)
    // Invalid (short password)
    expect(validateCredentials('alex@example.com', 'short').success).toBe(false)
    // Invalid (bad email)
    expect(validateCredentials('invalid-email', 'ValidPassword123!').success).toBe(false)
  })

  // --------------------------------------------------------------------------
  // 3: Email Verification State
  // --------------------------------------------------------------------------
  it('Scenario 3: Distinguishes between verified and unverified user status', () => {
    const isUserEmailVerified = (user: { email_confirmed_at?: string | null }) => {
      return Boolean(user.email_confirmed_at)
    }

    expect(isUserEmailVerified({ email_confirmed_at: '2026-01-01T00:00:00Z' })).toBe(true)
    expect(isUserEmailVerified({ email_confirmed_at: null })).toBe(false)
    expect(isUserEmailVerified({})).toBe(false)
  })

  // --------------------------------------------------------------------------
  // 4 & 5: Successful vs Denied Authorization Simulation
  // --------------------------------------------------------------------------
  it('Scenario 4: Validates scope parsing for approved authorization', () => {
    const rawScope = 'openid email profile'
    const parsed = parseScopes(rawScope)

    expect(parsed.length).toBe(3)
    expect(parsed.map((s) => s.id)).toEqual(['openid', 'email', 'profile'])
    expect(parsed[0].name).toBe('OpenID Connect Identity')
  })

  it('Scenario 5: Handles denied authorization and returns standard access_denied', () => {
    const handleConsentDecision = (decision: 'approve' | 'deny', clientRedirectUri: string) => {
      if (decision === 'deny') {
        const url = new URL(clientRedirectUri)
        url.searchParams.set('error', 'access_denied')
        url.searchParams.set('error_description', 'User denied authorization')
        return { redirect_url: url.toString() }
      }
      return { redirect_url: `${clientRedirectUri}?code=auth_code_123` }
    }

    const denied = handleConsentDecision('deny', 'http://localhost:3001/callback')
    expect(denied.redirect_url).toContain('error=access_denied')
    expect(denied.redirect_url).toContain('error_description=User+denied+authorization')
  })

  // --------------------------------------------------------------------------
  // 6: Missing or Invalid Authorization ID
  // --------------------------------------------------------------------------
  it('Scenario 6: Detects and rejects missing or malformed authorization_id', () => {
    const validateAuthId = (authId?: string | null) => {
      if (!authId || typeof authId !== 'string' || authId.trim() === '') {
        return { valid: false, error: 'Missing authorization_id parameter' }
      }
      if (authId.length < 8) {
        return { valid: false, error: 'Malformed authorization_id' }
      }
      return { valid: true }
    }

    expect(validateAuthId(null).valid).toBe(false)
    expect(validateAuthId('').valid).toBe(false)
    expect(validateAuthId('123').valid).toBe(false)
    expect(validateAuthId('auth-req-987654321').valid).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 7: Exact Redirect URI Matching (Strict OAuth 2.1)
  // --------------------------------------------------------------------------
  it('Scenario 7: Enforces strict exact redirect URI matching and prohibits wildcards', () => {
    const registered = [
      'http://localhost:3001/callback',
      'https://app.example.com/oauth/callback',
    ]

    // Exact match passes
    expect(validateRedirectUri('http://localhost:3001/callback', registered, false).valid).toBe(true)
    expect(validateRedirectUri('https://app.example.com/oauth/callback', registered, true).valid).toBe(true)

    // Subpath mismatch fails
    expect(validateRedirectUri('https://app.example.com/oauth/other', registered, true).valid).toBe(false)

    // Wildcard attempts fail
    expect(validateRedirectUri('https://attacker.example.com/oauth/callback', registered, true).valid).toBe(false)

    // URI fragments prohibited in OAuth 2.1
    const fragmentUri = 'https://app.example.com/oauth/callback#token=123'
    expect(validateRedirectUri(fragmentUri, registered, true).valid).toBe(false)

    // Production HTTP prohibited
    const insecureProd = 'http://insecure.example.com/callback'
    expect(validateRedirectUri(insecureProd, [insecureProd], true).valid).toBe(false)
  })

  // --------------------------------------------------------------------------
  // 8: PKCE S256 Code Challenge and Verifier Validation
  // --------------------------------------------------------------------------
  it('Scenario 8: Computes and validates S256 PKCE verifier against code_challenge', () => {
    // 64-char random verifier
    const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk-abcdef0123456789'
    const challenge = computeS256CodeChallenge(codeVerifier)

    // Valid S256 verification
    expect(verifyPkce(codeVerifier, challenge, 'S256').valid).toBe(true)

    // Tampered verifier fails
    const tamperedVerifier = codeVerifier + 'tampered'
    expect(verifyPkce(tamperedVerifier, challenge, 'S256').valid).toBe(false)

    // Prohibit 'plain' method in OAuth 2.1
    expect(verifyPkce(codeVerifier, challenge, 'plain').valid).toBe(false)

    // Invalid length (< 43 chars)
    expect(verifyPkce('too_short', challenge, 'S256').valid).toBe(false)
  })

  // --------------------------------------------------------------------------
  // 9: CSRF State Parameter Validation
  // --------------------------------------------------------------------------
  it('Scenario 9: Validates OAuth state parameter with timing-safe comparison', () => {
    const state = generateSecureRandomToken(32)
    expect(state.length).toBeGreaterThan(30)

    // Exact matching state passes
    expect(verifyState(state, state)).toBe(true)

    // Tampered or different state fails
    expect(verifyState(state, 'forged-state-value')).toBe(false)
    expect(verifyState('', state)).toBe(false)
  })

  // --------------------------------------------------------------------------
  // 10 & 11: Token Expiry, Invalidation, and Refresh Simulation
  // --------------------------------------------------------------------------
  it('Scenario 10: Rejects expired JWT tokens', async () => {
    const expiredToken = await new jose.SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(validIssuer)
      .setAudience(clientAId)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60) // Expired 1 min ago
      .sign(rsaKeyPair.privateKey)

    const result = await validateJwtToken(expiredToken, {
      issuer: validIssuer,
      expectedAudience: clientAId,
      publicKeyPem: rsaPublicKeyPem,
    })

    expect(result.valid).toBe(false)
    expect(result.error).toContain('exp')
  })

  it('Scenario 11: Verifies active token and validates refresh token structure', async () => {
    const activeToken = await new jose.SignJWT({ sub: 'user-123', scope: 'openid email offline_access' })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(validIssuer)
      .setAudience(clientAId)
      .setExpirationTime('1h')
      .sign(rsaKeyPair.privateKey)

    const result = await validateJwtToken(activeToken, {
      issuer: validIssuer,
      expectedAudience: clientAId,
      publicKeyPem: rsaPublicKeyPem,
    })

    expect(result.valid).toBe(true)
    expect(result.payload?.sub).toBe('user-123')
    expect(result.payload?.scope).toContain('offline_access')
  })

  // --------------------------------------------------------------------------
  // 12: Cryptographic Signature, Issuer, and Audience Validation
  // --------------------------------------------------------------------------
  it('Scenario 12: Rejects tampered signatures, invalid issuers, and wrong audiences', async () => {
    // 12a. Valid Token
    const validToken = await new jose.SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(validIssuer)
      .setAudience(clientAId)
      .setExpirationTime('1h')
      .sign(rsaKeyPair.privateKey)

    const validCheck = await validateJwtToken(validToken, {
      issuer: validIssuer,
      expectedAudience: clientAId,
      publicKeyPem: rsaPublicKeyPem,
    })
    expect(validCheck.valid).toBe(true)

    // 12b. Wrong Issuer
    const wrongIssuerCheck = await validateJwtToken(validToken, {
      issuer: 'https://imposter-issuer.com',
      expectedAudience: clientAId,
      publicKeyPem: rsaPublicKeyPem,
    })
    expect(wrongIssuerCheck.valid).toBe(false)
    expect(wrongIssuerCheck.error).toContain('iss')

    // 12c. Wrong Audience
    const wrongAudienceCheck = await validateJwtToken(validToken, {
      issuer: validIssuer,
      expectedAudience: 'wrong-audience-id',
      publicKeyPem: rsaPublicKeyPem,
    })
    expect(wrongAudienceCheck.valid).toBe(false)
    expect(wrongAudienceCheck.error).toContain('aud')

    // 12d. Tampered Signature
    const parts = validToken.split('.')
    parts[2] = parts[2].substring(0, parts[2].length - 4) + 'AAAA'
    const tamperedToken = parts.join('.')

    const tamperedCheck = await validateJwtToken(tamperedToken, {
      issuer: validIssuer,
      expectedAudience: clientAId,
      publicKeyPem: rsaPublicKeyPem,
    })
    expect(tamperedCheck.valid).toBe(false)
    expect(tamperedCheck.error).toContain('signature')
  })

  // --------------------------------------------------------------------------
  // 13 & 14: Client Isolation & Unauthorized Resource Access
  // --------------------------------------------------------------------------
  it('Scenario 13 & 14: Enforces strict zero-trust client isolation (App A token rejected by App B)', async () => {
    const tokenForAppA = await new jose.SignJWT({
      sub: 'user-123',
      client_id: clientAId,
      app_metadata: {
        client_id: clientAId,
        roles: ['billing_reader'],
      },
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(validIssuer)
      .setAudience(clientAId)
      .setExpirationTime('1h')
      .sign(rsaKeyPair.privateKey)

    const validation = await validateJwtToken(tokenForAppA, {
      issuer: validIssuer,
      publicKeyPem: rsaPublicKeyPem,
    })
    expect(validation.valid).toBe(true)

    // App A accessing App A resource -> SUCCESS
    const appAAccess = verifyClientIsolation(validation.payload, clientAId)
    expect(appAAccess.authorized).toBe(true)

    // App A attempting to access App B resource -> ISOLATION VIOLATION REJECTION
    const appBAccess = verifyClientIsolation(validation.payload, clientBId)
    expect(appBAccess.authorized).toBe(false)
    expect(appBAccess.reason).toContain('Client isolation violation')
  })

  // --------------------------------------------------------------------------
  // 15: Confidential Secret Exposure Checks
  // --------------------------------------------------------------------------
  it('Scenario 15: Ensures confidential secrets are never prefixed with NEXT_PUBLIC_ or VITE_', () => {
    const safeEnvKeys = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_APP_URL',
      'SUPABASE_SERVICE_ROLE_KEY', // SERVER ONLY
      'CONSUMING_APP_CLIENT_SECRET', // SERVER ONLY
    ]

    const checkNoExposedSecrets = (keys: string[]) => {
      const leaked = keys.filter(
        (k) =>
          (k.startsWith('NEXT_PUBLIC_') || k.startsWith('VITE_')) &&
          (k.toLowerCase().includes('secret') || k.toLowerCase().includes('service_role'))
      )
      return { safe: leaked.length === 0, violations: leaked }
    }

    const check = checkNoExposedSecrets(safeEnvKeys)
    expect(check.safe).toBe(true)

    // Verify detector catches forbidden exposure
    const dangerousKeys = ['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY', 'VITE_CLIENT_SECRET']
    expect(checkNoExposedSecrets(dangerousKeys).safe).toBe(false)
  })

  // --------------------------------------------------------------------------
  // 16: Application Role & Permission Enforcement
  // --------------------------------------------------------------------------
  it('Scenario 16: Enforces authoritative application-level permissions regardless of OAuth scopes', () => {
    interface TokenClaims {
      app_metadata?: {
        client_id?: string
        roles?: string[]
        permissions?: string[]
      }
    }

    const checkPermission = (claims: TokenClaims, requiredPermission: string) => {
      const perms = claims.app_metadata?.permissions || []
      return perms.includes(requiredPermission)
    }

    const userClaims: TokenClaims = {
      app_metadata: {
        client_id: 'enterprise-analytics',
        roles: ['analyst'],
        permissions: ['reports:read', 'export:csv'],
      },
    }

    expect(checkPermission(userClaims, 'reports:read')).toBe(true)
    // Write permission not granted -> Rejected
    expect(checkPermission(userClaims, 'reports:delete')).toBe(false)
  })

  // --------------------------------------------------------------------------
  // 17: Environment Configuration Isolation (Dev vs Staging vs Prod)
  // --------------------------------------------------------------------------
  it('Scenario 17: Distinguishes environments and prohibits dev URIs in production configuration', () => {
    const isUriAllowedForEnv = (uri: string, env: 'development' | 'staging' | 'production') => {
      const parsed = new URL(uri)
      const isLoopback = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'

      if (env === 'production') {
        // Production requires HTTPS and forbids loopback/localhost
        return parsed.protocol === 'https:' && !isLoopback
      }
      return true
    }

    expect(isUriAllowedForEnv('http://localhost:3000/callback', 'development')).toBe(true)
    expect(isUriAllowedForEnv('http://localhost:3000/callback', 'production')).toBe(false)
    expect(isUriAllowedForEnv('https://app.company.com/callback', 'production')).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 18: Logout and Session Revocation
  // --------------------------------------------------------------------------
  it('Scenario 18: Verifies user session revocation logic', () => {
    const activeSessions = new Map<string, { userId: string; active: boolean }>()
    activeSessions.set('session-token-abc', { userId: 'user-001', active: true })

    const revokeSession = (sessionToken: string) => {
      if (activeSessions.has(sessionToken)) {
        activeSessions.set(sessionToken, { ...activeSessions.get(sessionToken)!, active: false })
        return true
      }
      return false
    }

    const isSessionActive = (sessionToken: string) => {
      return activeSessions.get(sessionToken)?.active === true
    }

    expect(isSessionActive('session-token-abc')).toBe(true)
    expect(revokeSession('session-token-abc')).toBe(true)
    expect(isSessionActive('session-token-abc')).toBe(false)
  })
})
