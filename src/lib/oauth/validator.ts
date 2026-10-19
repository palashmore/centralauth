// ==============================================================================
// CentralAuth — OAuth 2.1 & OIDC Cryptographic and Security Validators
// ==============================================================================

import crypto from 'crypto'
import * as jose from 'jose'
import { TokenValidationResult } from '../types/auth'

/**
 * Validates the requested redirect URI against the exact list of registered URIs.
 * In OAuth 2.1:
 * - Exact string matching is required.
 * - Wildcards ('*', partial regex) are strictly prohibited.
 * - Fragments ('#') are forbidden.
 * - HTTP is prohibited except for loopback addresses (127.0.0.1, localhost) in local development.
 */
export function validateRedirectUri(
  requestedUri: string,
  registeredUris: string[],
  isProduction: boolean = false
): { valid: boolean; reason?: string } {
  if (!requestedUri || typeof requestedUri !== 'string') {
    return { valid: false, reason: 'Redirect URI is missing or empty' }
  }

  let parsed: URL
  try {
    parsed = new URL(requestedUri)
  } catch {
    return { valid: false, reason: 'Invalid URI format' }
  }

  if (parsed.hash) {
    return { valid: false, reason: 'Redirect URI must not contain a URI fragment (#)' }
  }

  // Scheme verification
  const isLocalhost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]'

  if (parsed.protocol !== 'https:') {
    if (parsed.protocol === 'http:') {
      if (isProduction && !isLocalhost) {
        return { valid: false, reason: 'Production redirect URIs must use HTTPS' }
      }
    } else {
      // Custom scheme for native apps (e.g. com.example.app:/oauth2redirect)
      if (!parsed.protocol.includes(':')) {
        return { valid: false, reason: 'Invalid URI scheme' }
      }
    }
  }

  // Exact matching against registered list
  const match = registeredUris.some((registered) => registered === requestedUri)
  if (!match) {
    return {
      valid: false,
      reason: 'Redirect URI does not match any registered URI for this client',
    }
  }

  return { valid: true }
}

/**
 * Computes S256 PKCE Code Challenge from Code Verifier (RFC 7636).
 * Code challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
 */
export function computeS256CodeChallenge(codeVerifier: string): string {
  return crypto
    .createHash('sha256')
    .update(codeVerifier, 'ascii')
    .digest('base64url')
}

/**
 * Verifies that a PKCE code_verifier matches the code_challenge provided during authorization.
 */
export function verifyPkce(
  codeVerifier: string,
  codeChallenge: string,
  method: string = 'S256'
): { valid: boolean; reason?: string } {
  if (method !== 'S256') {
    return { valid: false, reason: 'Only S256 PKCE code challenge method is permitted in OAuth 2.1' }
  }

  if (!codeVerifier || codeVerifier.length < 43 || codeVerifier.length > 128) {
    return {
      valid: false,
      reason: 'Code verifier must be between 43 and 128 characters (RFC 7636)',
    }
  }

  const computedChallenge = computeS256CodeChallenge(codeVerifier)

  // Constant-time buffer comparison to prevent timing attacks
  const bufA = Buffer.from(computedChallenge, 'utf8')
  const bufB = Buffer.from(codeChallenge, 'utf8')

  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return { valid: false, reason: 'PKCE verification failed: Code verifier does not match challenge' }
  }

  return { valid: true }
}

/**
 * Generates a cryptographically secure random state or nonce parameter.
 */
export function generateSecureRandomToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString('base64url')
}

/**
 * Constant-time state comparison to mitigate CSRF attacks.
 */
export function verifyState(receivedState: string, expectedState: string): boolean {
  if (!receivedState || !expectedState) return false
  const bufA = Buffer.from(receivedState, 'utf8')
  const bufB = Buffer.from(expectedState, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Validates a JWT token's signature, issuer, audience, and expiration.
 * Supports JWKS remote set or inline public key / symmetric secret.
 */
export async function validateJwtToken(
  token: string,
  options: {
    issuer: string
    expectedAudience?: string
    jwksUri?: string
    publicKeyPem?: string
    secretKey?: Uint8Array | string
  }
): Promise<TokenValidationResult> {
  try {
    let keyInput: jose.KeyLike | Uint8Array | jose.JWTVerifyGetKey

    if (options.jwksUri) {
      keyInput = jose.createRemoteJWKSet(new URL(options.jwksUri))
    } else if (options.publicKeyPem) {
      keyInput = await jose.importSPKI(options.publicKeyPem, 'RS256')
    } else if (options.secretKey) {
      keyInput =
        typeof options.secretKey === 'string'
          ? new TextEncoder().encode(options.secretKey)
          : options.secretKey
    } else {
      return { valid: false, error: 'No verification key or JWKS URI provided' }
    }

    const verifyOptions: jose.JWTVerifyOptions = {
      issuer: options.issuer,
      audience: options.expectedAudience,
    }

    const { payload } = await jose.jwtVerify(token, keyInput as any, verifyOptions)

    return {
      valid: true,
      payload: payload as TokenValidationResult['payload'],
    }
  } catch (err: any) {
    return {
      valid: false,
      error: `JWT verification failed: ${err.message || String(err)}`,
    }
  }
}

/**
 * Application-specific isolation check:
 * Enforces that a token issued for Client A cannot be used to access Client B's resources.
 */
export function verifyClientIsolation(
  tokenPayload: TokenValidationResult['payload'],
  expectedClientId: string
): { authorized: boolean; reason?: string } {
  if (!tokenPayload) {
    return { authorized: false, reason: 'Invalid token payload' }
  }

  // Check aud claim or client_id claim or app_metadata.client_id
  const tokenClientId =
    tokenPayload.client_id ||
    tokenPayload.app_metadata?.client_id ||
    (typeof tokenPayload.aud === 'string'
      ? tokenPayload.aud
      : Array.isArray(tokenPayload.aud)
      ? tokenPayload.aud[0]
      : undefined)

  if (!tokenClientId) {
    return {
      authorized: false,
      reason: 'Token contains no client identifier claim (client_id / audience)',
    }
  }

  if (tokenClientId !== expectedClientId) {
    return {
      authorized: false,
      reason: `Client isolation violation: Token issued for client '${tokenClientId}' cannot access resources belonging to '${expectedClientId}'`,
    }
  }

  return { authorized: true }
}
