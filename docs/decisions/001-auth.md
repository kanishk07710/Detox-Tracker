# ADR 001 — Authentication Strategy: Sessions vs JWT

**Status:** Accepted
**Date:** 2026-10-29
**Decider:** Kanishk

## Context

We need to authenticate users across requests. Two common approaches: server-side sessions (cookie + session store) vs JWTs (self-contained signed tokens). The frontend (Vercel) and backend (Render) are on different sites, so cookies are cross-site in production.

## Decision

- **Signed JWT (HS256) stored in an `HttpOnly` cookie named `dt_session`**, 7-day expiry, signed with `SESSION_SECRET`. The JWT is never exposed to frontend JavaScript and never put in `localStorage` (an XSS bug could not steal it).
- **Passwords hashed with `bcryptjs`** (cost 12). Chosen over argon2 because bcryptjs is pure JavaScript: no native build step to break on Windows or Render. argon2id is the stronger algorithm; revisit if we move to a Docker/native-friendly host.
- Cookie attributes by environment: production `Secure; SameSite=None` (required for cross-site Vercel to Render requests), local dev `SameSite=Lax` and not `Secure`. CORS allows only the exact `FRONTEND_ORIGIN` with credentials.
- Algorithm is pinned to HS256 on sign and verify. Login failures return one generic 401 ("Invalid email or password") and do equal hashing work for unknown emails.
- Auth routes are rate limited (10 attempts per 15 minutes per IP).

## Why not server-side sessions (the earlier leaning)

Sessions allow instant revocation but need a session table and a lookup on every request. For a single-user-scale learning app the stateless token is simpler, and the `/api/auth/me` endpoint re-checks that the user still exists. The known cost: a stolen token stays valid until it expires (no server-side revoke). Mitigations: HttpOnly, short-ish 7-day life, logout clears the cookie. If we need real revocation (password change invalidating sessions, "log out everywhere"), migrate to a `sessions` table; the `requireAuth` seam makes that a local change.

## Consequences

- No session store or extra migration needed.
- `SESSION_SECRET` is now critical: rotating it logs everyone out; leaking it lets anyone forge sessions. Production value lives only in the Render dashboard.
- Logout is client-side only (cookie cleared); the token itself remains valid until expiry if copied before logout.
- Cross-site cookies depend on browsers still allowing third-party cookies; a shared custom domain (e.g. `app.` and `api.` subdomains) would make this robust and allow `SameSite=Lax`.
