# Security Review Checklist (Phase 9)

Mapped to section E of `rules.md`. Status: done = verified in code/tests, manual = to confirm on the live deployment.

| # | Rule | Status | Evidence |
|---|------|--------|----------|
| E1 | No plaintext passwords; bcrypt/argon2 | done | `services/authService.ts` bcryptjs cost 12; responses never include hashes (auth test) |
| E2 | No secrets committed | manual | `.env.example` dummies only; run secret scan before release; production values set in Render/Vercel dashboards |
| E3 | Secrets not in frontend | manual | Only `NEXT_PUBLIC_API_URL` is public; grep frontend for `SESSION_SECRET`/`DATABASE_URL` |
| E4 | Frontend never talks to DB | done | Frontend only calls the Express API |
| E5 | Auth + ownership on protected routes | done | `requireAuth` mounted in `routes/index.ts`; queries scoped by `req.user.id`; test "user A cannot see or delete user B logs" (404) |
| E6 | Cookie flags | done | `lib/sessionCookie.ts`: HttpOnly always; Secure + SameSite=None in production; test checks HttpOnly/Lax locally. manual: confirm `Secure; SameSite=None` in browser devtools on the live site |
| E7 | CORS exact origin, never `*` with credentials | done | `app.ts` uses `FRONTEND_ORIGIN` |
| E8 | Generic login errors | done | Same 401 body for unknown email and wrong password (test); equal bcrypt work to limit timing leak |
| E9 | No internals in errors | done | Central `errorHandler` returns generic 500; stack traces only in server logs |
| E10 | Supabase keys/RLS | manual | Enable RLS on every table; never use `service_role`; DB URL only in backend env |
| E11 | Rotate leaked secrets | process | If `SESSION_SECRET` ever leaks, set a new value in Render (logs everyone out) |

## Additional hardening in place

- `helmet()` security headers on every response.
- Rate limit on `/api/auth/register` and `/api/auth/login`: 10 per 15 min per IP, returns 429 `RATE_LIMITED`. `trust proxy` is set to 1 so the real client IP is used behind Render.
- Passwords limited to 8-72 characters (bcrypt ignores bytes past 72; the cap also bounds hashing cost).
- JWT algorithm pinned to HS256; expiry 7 days.
- `GET /health` is intentionally unauthenticated (Render health check) and leaks only `status` and `env`.
- All input validated with Zod before reaching services.

## Known gaps / follow-ups

- No server-side session revocation (see ADR 001).
- Rate limiter store is in-memory: resets on restart and is per instance. Fine for a single Render instance; use a shared store if scaled out.
- No account lockout, email verification or password reset yet.
- No CSRF token: mitigated by CORS exact origin and JSON-only bodies, but with `SameSite=None` in production, keep state-changing routes JSON-only (never accept form posts) and consider a custom shared domain with `SameSite=Lax`.
- Run `npm audit` in CI/Dependabot reviews.
