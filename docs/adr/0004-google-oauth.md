# ADR 0004 — Google sign-in (OAuth authorization-code), own-JWT session

- Status: Accepted (2026-10-10)
- Context: Phase 1 auth ships email+password only; social login reduces signup
  friction for a Vietnamese storefront, and Google is the dominant provider.

## Decision

Add **Google OAuth 2.0 authorization-code** sign-in as a second method next to
email+password. Google is consulted **only at login**; afterwards the session is
the exact same stateless JWT pair (15-min access + rotating httpOnly refresh
cookie) used by password login. No Google tokens are stored.

### Flow

```
browser ──GET /api/v1/auth/oauth/google/authorize?redirect_uri=<storefront origin>
       ←─302 Google consent + Set-Cookie oauth_state, oauth_redirect (10 min, httpOnly)
Google ──GET /api/v1/auth/oauth/google/callback?code&state
       │  verify state cookie (constant-time), exchange code + fetch userinfo (TLS)
       │  resolve account: identity → user | verified email → link | else create passwordless
       ←─302 storefront + Set-Cookie refresh_token (+ adopted cart_token)
browser bootstrap: /me fails → /refresh (cookie) → /me — session restored, no JS token handoff
```

Failure at any step redirects back with `?auth_error=<code>` — never JSON, never
tokens in URLs.

### Data model (V7)

- `user_identities(provider, provider_user_id UNIQUE)` — one account may hold
  several identities plus a password.
- `users.password_hash` becomes nullable: OAuth-only accounts have none, and
  password login simply fails for them (bcrypt `matches(raw, null)` → false).

## Alternatives considered

- **`spring-boot-starter-oauth2-client`**: its filters/session model targets
  server-side sessions; for this stateless API we would only use its URL
  builder. The hand-rolled flow is ~150 lines, zero new dependencies, and fully
  unit-testable (`GoogleOAuthClient` via `MockRestServiceServer`). Revisit if we
  add OIDC validation or more providers.
- **id_token/JWKS validation**: we read identity from Google's userinfo endpoint
  over TLS instead of validating the id_token signature. Equivalent assurance
  for this flow; documented trade-off.
- **Frontend token exchange (implicit/PKCE-only)**: leaks tokens to the browser
  and breaks the "access token lives in memory, refresh in httpOnly cookie"
  model — rejected.

## Security notes

- `state` is a 32-byte SecureRandom value in an httpOnly cookie, compared
  constant-time on callback (CSRF).
- Return target must be origin-allowlisted; only the origin is kept (no
  attacker-controlled path/query).
- Accounts are linked by email **only** when Google reports `email_verified`.
- Empty `GOOGLE_CLIENT_ID/SECRET` keeps the app bootable (CI/new devs); the
  authorize endpoint then redirects with `auth_error=oauth_not_configured`.
- Callback URL is derived from the incoming request; behind a proxy in
  staging/prod, forward `X-Forwarded-*` (Spring server-forward-headers-strategy)
  so Google sees the public origin.

## Operations

Google Cloud Console → Credentials → OAuth client (Web application), authorized
redirect URI: `http://localhost:8080/api/v1/auth/oauth/google/callback` (+
public origin in prod). Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars
(see `apps/api/.env.example`).

Note: like the cart cookie, the OAuth round-trip requires the storefront to be
browsed at the same site name as the API (use `http://localhost:4321`, not
`127.0.0.1:4321`, when `PUBLIC_API_URL` is `http://localhost:8080`).
