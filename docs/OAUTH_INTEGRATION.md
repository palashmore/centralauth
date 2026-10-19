# Consuming Application Integration Guide

This guide describes how to integrate existing and new applications with **CentralAuth** as their centralized OAuth 2.1 / OpenID Connect Identity Provider.

---

## 1. Quick Reference: Endpoints

Replace `<project-ref>` with your CentralAuth Supabase project reference:

| Purpose | Endpoint URL | Method |
| :--- | :--- | :--- |
| **OpenID Discovery** | `https://<project-ref>.supabase.co/auth/v1/.well-known/openid-configuration` | `GET` |
| **Authorization Endpoint** | `https://<project-ref>.supabase.co/auth/v1/oauth/authorize` | `GET` |
| **Token Endpoint** | `https://<project-ref>.supabase.co/auth/v1/oauth/token` | `POST` |
| **JWKS Public Key Set** | `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` | `GET` |
| **Consent Interface** | `https://auth.company.com/oauth/consent` | Browser UI |

---

## 2. Public Client Integration (React / Vue / SPA / Mobile)

Public clients (browser SPAs, iOS, Android, Flutter) cannot securely protect client secrets. Under **OAuth 2.1**, public clients **must** use the Authorization Code Flow with **PKCE (Proof Key for Code Exchange)** using `S256`.

### Step 1: Generate PKCE Parameters in Browser

```typescript
// pkce.ts - Pure Web Crypto PKCE Generator
function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function generatePkce() {
  // 1. Generate random code_verifier (43-128 chars)
  const randomBytes = new Uint8Array(32)
  crypto.getRandomValues(randomBytes)
  const codeVerifier = base64UrlEncode(randomBytes.buffer)

  // 2. Hash with SHA-256
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const hash = await crypto.subtle.digest('SHA-256', data)

  // 3. Base64url encode the digest -> code_challenge
  const codeChallenge = base64UrlEncode(hash)

  return { codeVerifier, codeChallenge }
}

export function generateState(): string {
  const randomBytes = new Uint8Array(24)
  crypto.getRandomValues(randomBytes)
  return base64UrlEncode(randomBytes.buffer)
}
```

### Step 2: Redirect User to CentralAuth

```typescript
// login.ts
import { generatePkce, generateState } from './pkce'

const SUPABASE_AUTH_URL = 'https://<project-ref>.supabase.co/auth/v1/oauth/authorize'
const CLIENT_ID = 'customer-portal-spa-dev'
const REDIRECT_URI = 'http://localhost:3001/callback'

export async function startLogin() {
  const { codeVerifier, codeChallenge } = await generatePkce()
  const state = generateState()

  // Store code_verifier and state in sessionStorage for callback validation
  sessionStorage.setItem('oauth_verifier', codeVerifier)
  sessionStorage.setItem('oauth_state', state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid email profile',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  window.location.href = `${SUPABASE_AUTH_URL}?${params.toString()}`
}
```

### Step 3: Handle Callback and Exchange Code for Tokens

```typescript
// callback.ts (Executed on http://localhost:3001/callback)
export async function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const returnedState = urlParams.get('state')
  const error = urlParams.get('error')

  if (error) {
    throw new Error(`Authentication failed: ${error} - ${urlParams.get('error_description')}`)
  }

  // 1. Validate CSRF state
  const storedState = sessionStorage.getItem('oauth_state')
  if (!returnedState || returnedState !== storedState) {
    throw new Error('CSRF State mismatch! Possible cross-site request forgery.')
  }

  const codeVerifier = sessionStorage.getItem('oauth_verifier')
  if (!code || !codeVerifier) {
    throw new Error('Missing authorization code or verifier.')
  }

  // 2. Exchange authorization code for tokens
  const tokenEndpoint = 'https://<project-ref>.supabase.co/auth/v1/oauth/token'
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'customer-portal-spa-dev',
      code: code,
      redirect_uri: 'http://localhost:3001/callback',
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`)
  }

  const tokens = await response.json()
  // tokens contains: access_token, id_token, refresh_token, token_type, expires_in

  // Clean up session storage
  sessionStorage.removeItem('oauth_state')
  sessionStorage.removeItem('oauth_verifier')

  return tokens
}
```

---

## 3. Confidential Client Integration (Node.js / Express / Backend)

Confidential clients run on a secure server capable of maintaining a confidential `client_secret`.

### Token Exchange in Express / Node.js

```typescript
// server.ts
import express from 'express'
import crypto from 'crypto'

const app = express()

const CLIENT_ID = process.env.CENTRALAUTH_CLIENT_ID!
const CLIENT_SECRET = process.env.CENTRALAUTH_CLIENT_SECRET! // Kept server-side only
const REDIRECT_URI = process.env.CENTRALAUTH_REDIRECT_URI!
const TOKEN_ENDPOINT = 'https://<project-ref>.supabase.co/auth/v1/oauth/token'

app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    return res.status(400).send(`Authentication error: ${error}`)
  }

  const storedState = req.cookies['oauth_state']
  const codeVerifier = req.cookies['code_verifier']

  if (!state || state !== storedState) {
    return res.status(400).send('State verification failed.')
  }

  try {
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(401).json(data)
    }

    // Set secure HttpOnly session cookie
    res.cookie('app_session', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in * 1000,
    })

    res.redirect('/dashboard')
  } catch (err) {
    res.status(500).send('Internal server authentication failure.')
  }
})
```

---

## 4. Resource Server (API) Token Verification

Consuming backend APIs (Resource Servers) MUST validate bearer tokens passed in the `Authorization: Bearer <token>` header.

### Validation using `jose` and Remote JWKS:

```typescript
// authMiddleware.ts
import { Request, Response, NextFunction } from 'express'
import * as jose from 'jose'

const ISSUER = 'https://<project-ref>.supabase.co/auth/v1'
const JWKS_URI = `${ISSUER}/.well-known/jwks.json`
const EXPECTED_CLIENT_ID = 'customer-portal-spa-dev'

// Cache the remote JWKS set in memory
const remoteJWKS = jose.createRemoteJWKSet(new URL(JWKS_URI))

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // 1. Verify asymmetric RS256/ES256 signature, expiry, and issuer
    const { payload } = await jose.jwtVerify(token, remoteJWKS, {
      issuer: ISSUER,
    })

    // 2. Enforce Client Isolation
    const tokenAudience = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud
    const tokenClientId = (payload as any).client_id || tokenAudience

    if (tokenClientId !== EXPECTED_CLIENT_ID) {
      return res.status(403).json({
        error: 'Forbidden: Token was issued for a different OAuth client.',
      })
    }

    // 3. Attach authenticated identity to request
    (req as any).user = {
      id: payload.sub,
      email: (payload as any).email,
      roles: (payload as any).app_metadata?.roles || [],
      permissions: (payload as any).app_metadata?.permissions || [],
    }

    next()
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired token', message: err.message })
  }
}
```
