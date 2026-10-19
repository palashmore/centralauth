// ==============================================================================
// CentralAuth — Token Validation Utility Route Handler
// ==============================================================================

import { NextResponse } from 'next/server'
import { validateJwtToken, verifyClientIsolation } from '@/lib/oauth/validator'

export async function POST(request: Request) {
  try {
    const { token, expected_client_id } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Missing token in request body' }, { status: 400 })
    }

    const issuer = process.env.OAUTH_ISSUER_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`
    const jwksUri = process.env.OAUTH_JWKS_URI || `${issuer}/.well-known/jwks.json`

    // Verify cryptographic signature and standard claims
    const validation = await validateJwtToken(token, {
      issuer,
      jwksUri,
    })

    if (!validation.valid) {
      return NextResponse.json(
        { valid: false, error: validation.error },
        { status: 401 }
      )
    }

    // If client isolation check requested:
    if (expected_client_id) {
      const isolationCheck = verifyClientIsolation(validation.payload, expected_client_id)
      if (!isolationCheck.authorized) {
        return NextResponse.json(
          { valid: false, error: isolationCheck.reason },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      valid: true,
      claims: validation.payload,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Token verification failed' },
      { status: 500 }
    )
  }
}
