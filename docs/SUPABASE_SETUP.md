# Supabase Dashboard Setup Guide for CentralAuth

This guide outlines the step-by-step setup in the Supabase Dashboard to configure **CentralAuth** as an enterprise-grade OAuth 2.1 and OpenID Connect Identity Provider.

---

## Step 1: Create a Dedicated Supabase Project

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project** and select your organization.
3. Configure project details:
   - **Name**: `CentralAuth-IdP` (or `CentralAuth-Production` / `CentralAuth-Staging`).
   - **Database Password**: Generate a high-entropy password (24+ characters) and store it in your team's password vault.
   - **Region**: Select the region closest to your user base and consuming infrastructure.
   - **Pricing Plan**: Pro or Team recommended for production SLA, custom domains, and asymmetric JWT signing.
4. Once provisioned, navigate to **Project Settings > API**:
   - Record **Project URL** (e.g., `https://abcdefghijklm.supabase.co`).
   - Record **Project Reference ID** (e.g., `abcdefghijklm`).
   - Retrieve the **Publishable / Anon Key** (use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   - Retrieve the **Service Role Key** (use for `SUPABASE_SERVICE_ROLE_KEY`).
   > [!CAUTION]
   > The `service_role` key bypasses all Row Level Security. Never commit it to git, never place it in frontend client bundles, and never distribute it to consuming applications.

---

## Step 2: Configure Authentication URLs

Navigate to **Authentication > URL Configuration** in the left sidebar.

```
┌────────────────────────────────────────────────────────┐
│ Authentication > URL Configuration                     │
│                                                        │
│ Site URL:                                              │
│ [ https://auth.company.com                           ] │
│                                                        │
│ Redirect URLs:                                         │
│ ┌────────────────────────────────────────────────────┐ │
│ │ http://localhost:3000/api/auth/callback            │ │
│ │ https://auth.company.com/api/auth/callback         │ │
│ │ https://auth.company.com/oauth/consent             │ │
│ │ https://auth.company.com/reset-password            │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

1. **Site URL**:
   - For local development: `http://localhost:3000`
   - For production: `https://auth.company.com` (your CentralAuth deployment origin).
2. **Redirect URLs**:
   - Add the specific routes required by CentralAuth itself:
     - `http://localhost:3000/api/auth/callback`
     - `https://auth.company.com/api/auth/callback`
     - `https://auth.company.com/oauth/consent`
     - `https://auth.company.com/reset-password`
3. Click **Save Changes**.

> [!IMPORTANT]
> **Key Distinction**: The URLs configured here in *Authentication > URL Configuration* govern Supabase's general user authentication redirects (such as email confirmation links and magic links). They are **completely distinct** from individual OAuth Client redirect URIs configured in *OAuth Apps*.

---

## Step 3: Enable the Supabase OAuth 2.1 Server

Navigate to **Authentication > OAuth Server** in the left sidebar.

```
┌────────────────────────────────────────────────────────┐
│ Authentication > OAuth Server                          │
│                                                        │
│ [x] Enable OAuth Server                                │
│                                                        │
│ Authorization Path:                                    │
│ [ /oauth/consent                                     ] │
│                                                        │
│ Dynamic Client Registration:                           │
│ [ ] Enable Dynamic OAuth App Registration (Disabled)   │
└────────────────────────────────────────────────────────┘
```

1. Toggle **Enable OAuth Server** to **ON**.
2. **Authorization Path**: Enter `/oauth/consent`.
   - When a consuming application initiates an OAuth authorization flow, Supabase will direct the user's browser to `<Site URL>/oauth/consent?authorization_id=<ID>`.
3. **Dynamic Client Registration**: Leave **Disabled** for managed enterprise environments. Consuming applications should be onboarded through controlled administrative approval.
4. Click **Save Changes**.

---

## Step 4: Configure Asymmetric JWT Signing (RS256 / ES256)

Navigate to **Project Settings > Authentication > JWT Settings**.

1. Verify that your project is configured with asymmetric signing keys (such as `RS256` or `ES256`) rather than legacy shared symmetric secrets (`HS256`).
2. Verify the public JWKS endpoint is active:
   `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`
3. Consuming microservices and APIs will fetch this JWKS to verify token signatures independently without requiring database credentials or symmetric secret keys.

---

## Step 5: Register Your First OAuth Application

Navigate to **Authentication > OAuth Apps** in the left sidebar and click **Add Application**.

```
┌────────────────────────────────────────────────────────┐
│ Add OAuth Application                                  │
│                                                        │
│ Application Name: Customer Portal Web App (Dev)       │
│ Client Type:      (o) Public (SPA / Mobile with PKCE)  │
│                   ( ) Confidential (Server Web App)    │
│                                                        │
│ Redirect URIs (exact matching, one per line):          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ http://localhost:3001/callback                     │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ Scopes: openid email profile                           │
└────────────────────────────────────────────────────────┘
```

1. **Application Name**: Name shown to users on the consent screen (e.g. `Customer Portal Web App (Dev)`).
2. **Client Type**:
   - **Public Client**: Select for Single Page Applications (React, Vue, Angular) or Mobile Apps (iOS, Android, Flutter). Public clients **must** use PKCE and do not hold client secrets.
   - **Confidential Client**: Select for server-side rendered web applications (Next.js server-side, Django, Rails) where client secrets can be stored securely in server environment variables.
3. **Redirect URIs**:
   - Provide the exact callback URL of the consuming application (e.g., `http://localhost:3001/callback` for dev, `https://portal.company.com/callback` for prod).
   - **Strict Rule**: No wildcards (`*`), no URL fragments (`#`).
4. Click **Save**.
5. Copy the generated **Client ID**. For confidential clients, copy the **Client Secret** immediately and save it directly into the consuming application's secure server secrets manager.

---

## Step 6: Deploy and Verify the Consent Screen

1. Deploy the CentralAuth project to your hosting platform (Vercel, AWS ECS, Cloud Run, etc.).
2. Ensure environment variables are loaded:
   - `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>`
   - `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
   - `NEXT_PUBLIC_APP_URL=https://auth.company.com`
3. Test visiting `https://auth.company.com/oauth/consent`.
   - Without an `authorization_id`, it should safely display an informative error: *"Invalid authorization request: Missing authorization_id parameter"*.

---

## Step 7: Verify Discovery and Protocol Endpoints

Run curl or test in your browser using your actual project reference:

### 1. OpenID Connect Discovery:
```bash
curl -s https://<project-ref>.supabase.co/auth/v1/.well-known/openid-configuration | jq .
```
Expected output: JSON containing `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `scopes_supported` (`openid`, `email`, `profile`).

### 2. OAuth 2.1 Authorization Server Metadata:
```bash
curl -s https://<project-ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1 | jq .
```

### 3. JWKS Public Keys:
```bash
curl -s https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json | jq .
```
Expected output: JSON Web Key Set with `keys` array containing public RSA/EC key definitions (`kid`, `kty`, `alg`, `n`, `e`).

### 4. Interactive Authorization Flow:
Open in a browser:
```
https://<project-ref>.supabase.co/auth/v1/oauth/authorize?response_type=code&client_id=<YOUR_CLIENT_ID>&redirect_uri=http://localhost:3001/callback&scope=openid%20email%20profile&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256&state=random_state_123
```
- Browser redirects to `https://auth.company.com/oauth/consent?authorization_id=...`
- Consent screen renders requesting app name, client logo, and requested scopes.
- Clicking **Authorize** redirects to `http://localhost:3001/callback?code=AUTH_CODE&state=random_state_123`.
