# CentralAuth System Architecture & Trust Boundaries

## 1. Executive Architecture Overview

**CentralAuth** is a centralized, reusable Identity and Access Management (IAM) platform built upon Supabase Auth's OAuth 2.1 and OpenID Connect authorization server capabilities.

CentralAuth serves as the single source of truth for user authentication and authorization across multiple independent web, mobile, and backend microservices.

```mermaid
flowchart TD
    subgraph ConsumingEcosystem["Consuming Applications Ecosystem"]
        SPA["Public Client (SPA / Mobile)\nPKCE S256 (No Secret)"]
        BackendApp["Confidential Client (Web App)\nServer-side Secret Protected"]
        APIResource["Resource Server (API)\nAsymmetric JWKS Token Verification"]
    end

    subgraph CentralAuthIdP["CentralAuth Identity Provider (Supabase Auth)"]
        ConsentScreen["/oauth/consent (Consent Interface)"]
        AuthServer["Supabase OAuth 2.1 Server\n(RFC 6749, RFC 7636, OIDC)"]
        JWKSEndpoint["/.well-known/jwks.json\n(RS256 / ES256 Public Keys)"]
        CentralDB[("Supabase PostgreSQL\nauth.users + oauth_app_registry")]
    end

    SPA -->|"1. /oauth/authorize (code_challenge S256)"| AuthServer
    BackendApp -->|"1. /oauth/authorize (code_challenge S256)"| AuthServer
    AuthServer -->|"2. Redirect to consent"| ConsentScreen
    ConsentScreen -->|"3. approveAuthorization()"| AuthServer
    AuthServer -->|"4. Authorization Code"| ConsumingEcosystem
    SPA -->|"5. /oauth/token (code + code_verifier)"| AuthServer
    BackendApp -->|"5. /oauth/token (code + verifier + secret)"| AuthServer
    AuthServer -->|"6. Access Token + ID Token"| ConsumingEcosystem
    APIResource -->|"Verify Signature (Offline Cache)"| JWKSEndpoint
    APIResource -->|"Inspect client_id & aud"| APIResource
```

---

## 2. Core Architectural Principles

### 1. Centralized Identity, Decentralized Resource Ownership
- **Single Identity Store**: All users exist within the central Supabase `auth.users` directory. Passwords, MFA factors, social identity logins, and recovery keys are never duplicated.
- **Independent Resource Authorization**: An OAuth token proves *who the user is* and *which client they authorized*. It does **not** grant unilateral database privileges. Each consuming application independently maps user IDs (`sub`) and client IDs (`aud`) to its own internal tenant, role, and permission models.

### 2. Zero-Trust Client Isolation
- Consuming applications are registered as separate OAuth clients with unique `client_id`s.
- Tokens issued for **Client A** carry `aud: "client-a-id"` or `client_id: "client-a-id"`. If presented to **Client B's** backend, Client B's resource server must immediately reject the token with an HTTP 403 Forbidden.

### 3. Asymmetric Cryptographic Signing (RS256 / ES256)
- Tokens issued by the CentralAuth Authorization Server are signed using asymmetric private keys maintained exclusively by the authorization server.
- Consuming resource servers retrieve the public key set via `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`.
- Consuming applications **never** receive the Supabase `SUPABASE_SERVICE_ROLE_KEY` or private signing keys.

---

## 3. Trust Boundaries & Network Zones

| Zone | Component | Privilege Level | Exposed Secrets |
| :--- | :--- | :--- | :--- |
| **Zone 1: Public Browser / Device** | SPA, Mobile App, End User | Untrusted | Only `client_id`, `code_challenge`, and Public Anon Key. **Zero Client Secrets**. |
| **Zone 2: CentralAuth Frontend** | `/oauth/consent`, `/login`, `/register` | User Interactive Session | Uses `@supabase/ssr` with HttpOnly, SameSite cookies. |
| **Zone 3: CentralAuth Server Runtime** | API Route Handlers (`/api/admin/*`) | Privileged Server-Side | `SUPABASE_SERVICE_ROLE_KEY` (restricted strictly to server runtime). |
| **Zone 4: Consuming Server App** | Node.js / Python / Go Backend | Confidential Client | `client_id`, `client_secret` (stored in AWS Secrets Manager / Vault / secure `.env`). |
| **Zone 5: Supabase Auth Core** | GoTrue OAuth 2.1 Engine | Root Identity Authority | Private asymmetric JWT signing keys, password bcrypt hashes, MFA seeds. |

---

## 4. Complete OAuth 2.1 Authorization Code Flow with PKCE

```mermaid
sequenceDiagram
    autonumber
    actor User as End User
    participant ClientApp as Consuming Application (Public/Confidential)
    participant SupabaseAuth as Supabase OAuth 2.1 Server
    participant ConsentUI as CentralAuth Consent (/oauth/consent)
    participant ResourceAPI as Consuming Resource API

    User->>ClientApp: Click "Sign in with CentralAuth"
    Note over ClientApp: Generate code_verifier & code_challenge (S256)<br/>Generate random CSRF state
    ClientApp->>SupabaseAuth: GET /auth/v1/oauth/authorize?response_type=code&client_id=...&redirect_uri=...&scope=...&state=...&code_challenge=...&code_challenge_method=S256
    SupabaseAuth->>ConsentUI: Redirect to /oauth/consent?authorization_id=auth_xyz
    ConsentUI->>ConsentUI: Check user session. If unauthenticated, redirect to /login
    ConsentUI->>SupabaseAuth: supabase.auth.oauth.getAuthorizationDetails(auth_xyz)
    SupabaseAuth-->>ConsentUI: Return client_name, logo_uri, requested scopes
    ConsentUI->>User: Display consent prompt (App name & scopes)
    User->>ConsentUI: Click "Authorize"
    ConsentUI->>SupabaseAuth: supabase.auth.oauth.approveAuthorization(auth_xyz)
    SupabaseAuth-->>ConsentUI: Return validated redirect_url?code=AUTH_CODE&state=CSRF_STATE
    ConsentUI-->>ClientApp: Redirect browser to ClientApp registered callback URL
    Note over ClientApp: Verify state matches stored state
    ClientApp->>SupabaseAuth: POST /auth/v1/oauth/token (grant_type=authorization_code, code, code_verifier, client_id, [client_secret])
    SupabaseAuth->>SupabaseAuth: Verify PKCE verifier (S256) & client credentials
    SupabaseAuth-->>ClientApp: Return access_token (JWT), id_token (OIDC), refresh_token
    ClientApp->>ResourceAPI: Request API resource with Bearer access_token
    ResourceAPI->>ResourceAPI: Validate JWT via JWKS (RS256), verify issuer, expiry, audience
    ResourceAPI-->>ClientApp: Return authorized data
```

---

## 5. Token Structure & Custom Claims Hook

When an OAuth client exchanges an authorization code, Supabase Auth emits a standard JWT. With the CentralAuth Custom Access Token Hook enabled in PostgreSQL:

```json
{
  "iss": "https://<project-ref>.supabase.co/auth/v1",
  "sub": "b2c6e210-951b-410a-85b4-d54dca87e382",
  "aud": "customer-portal-spa-dev",
  "exp": 1776510000,
  "nbf": 1776506400,
  "iat": 1776506400,
  "email": "alex.morgan@company.com",
  "app_metadata": {
    "provider": "email",
    "client_id": "customer-portal-spa-dev",
    "roles": ["customer_admin"],
    "permissions": ["orders:read", "orders:create", "invoices:download"]
  },
  "user_metadata": {
    "full_name": "Alex Morgan"
  },
  "scope": "openid email profile"
}
```

This guarantees client-isolated RBAC without allowing clients to falsify their own roles.
