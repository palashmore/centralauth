# CentralAuth Security Architecture & Threat Model

This document outlines the security controls, cryptographic standards, threat mitigations, and compliance rules governing the CentralAuth identity platform.

---

## 1. Threat Matrix & Defense-in-Depth Mitigations

| Threat | Risk Level | Mitigation in CentralAuth |
| :--- | :--- | :--- |
| **Authorization Code Interception** | High | **Mandatory PKCE with S256** (RFC 7636). Plain method prohibited. Public clients cannot complete exchange without ephemeral `code_verifier`. |
| **Cross-Site Request Forgery (CSRF)** | High | **Cryptographic State Parameter**: High-entropy `state` token verified via constant-time comparison. Secure SameSite cookies on web sessions. |
| **Open Redirect / Token Leaks** | Critical | **Exact Redirect URI Matching**: Strict string equality check against pre-registered URIs. Wildcards (`*`), subdomains, and URI fragments (`#`) are explicitly forbidden. |
| **Cross-Application Privilege Escalation** | Critical | **Audience and Client Isolation**: Consuming resource servers must verify that the token's `aud` / `client_id` matches their own registered client ID. App A tokens are rejected by App B. |
| **Client Secret Leakage** | Critical | **Client Architecture Segregation**: Browser SPAs and Mobile clients are strictly registered as Public clients without secrets. Confidential secrets are restricted to backend environment variables. |
| **Service Role Key Disclosure** | Critical | **Server-Side Isolation**: `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `NEXT_PUBLIC_` and never included in frontend bundles. |
| **Token Forgery / Tampering** | High | **Asymmetric RS256/ES256 Verification**: Tokens signed with private keys. Public JWKS keys cached and verified offline via `jose`. |
| **Replay / Session Hijacking** | Medium | **Short-Lived Access Tokens**: Access tokens configured with 1-hour expiry. Refresh token rotation enabled. Immediate revocation on logout. |

---

## 2. Authentication & Authorization Boundaries

### "Authentication is NOT Authorization"
A successful OAuth login confirms the user's authentic identity (`sub`) and email verification status. **It does not automatically grant access to an application's internal business data.**

Every consuming application is responsible for:
1. Verifying the token was issued specifically for its `client_id`.
2. Mapping the `sub` claim to internal organizational membership, tenants, or workspaces.
3. Enforcing internal role-based access control (RBAC) and database Row Level Security (RLS).

---

## 3. Cryptographic Standards

- **PKCE**: SHA-256 with URL-safe base64 encoding (RFC 7636 Section 4.2). Minimum code verifier entropy: 32 bytes (43 characters).
- **State & Nonce Generation**: Generated via cryptographically secure pseudo-random number generator (`crypto.getRandomValues` in browser, `crypto.randomBytes` in Node.js).
- **JWT Signatures**: Asymmetric algorithms (`RS256` / `ES256`). Public keys distributed through standard RFC 7517 JWKS.
- **Password Storage**: Handled authoritatively by Supabase Auth (Argon2 / bcrypt with per-user salt). Custom password storage is prohibited.

---

## 4. Row Level Security (RLS) Policy Architecture

All application tables created in PostgreSQL implement strict RLS:

```sql
-- Example: oauth_app_registry RLS
ALTER TABLE public.oauth_app_registry ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: Authenticated users can view active clients (needed for consent UI)
CREATE POLICY "Allow authenticated users to read active apps"
    ON public.oauth_app_registry
    FOR SELECT
    TO authenticated
    USING (status = 'active' OR public.is_centralauth_admin());

-- 2. Write Policy: Restricted to Platform Administrators only
CREATE POLICY "Admins full management of app registry"
    ON public.oauth_app_registry
    FOR ALL
    TO authenticated
    USING (public.is_centralauth_admin())
    WITH CHECK (public.is_centralauth_admin());
```

---

## 5. Secret Rotation & Offboarding Protocol

1. **Confidential Client Secret Rotation**:
   - In Supabase Dashboard (**Authentication > OAuth Apps**), select the application.
   - Click **Regenerate Secret**.
   - Supabase supports an overlapping grace period or immediate invalidation.
   - Deploy the new secret into the consuming application's secrets manager.
2. **Revoking Application Access**:
   - Set client status to `revoked` in `oauth_app_registry`.
   - Delete or disable the client in Supabase OAuth Apps.
   - Ongoing token exchanges will fail immediately with `invalid_client`.
3. **User Access Revocation**:
   - An administrator can disable a user account or revoke active sessions in Supabase Auth (**Authentication > Users > Ban User / Sign out user**).
   - Once revoked in Supabase, refresh token requests are rejected immediately.
