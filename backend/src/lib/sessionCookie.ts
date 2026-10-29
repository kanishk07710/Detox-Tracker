/**
 * lib/sessionCookie.ts — the one place that decides cookie attributes.
 *
 * WHY environment-dependent:
 *   - Vercel (frontend) and Render (backend) are different SITES (*.vercel.app vs
 *     *.onrender.com), so the browser treats our API calls as cross-site. A
 *     SameSite=Lax cookie would never be sent on those fetches. Production
 *     therefore needs `SameSite=None; Secure`.
 *   - Locally (localhost:3000 -> localhost:4000) both are the same site, so Lax
 *     works, and `Secure` would break plain-http dev.
 */
import type { CookieOptions } from 'express';
import { env } from '../config/env';

export const SESSION_COOKIE_NAME = 'dt_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function sessionCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true, // JS (and therefore XSS) can't read the token
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
}

export function sessionCookieWithMaxAge(): CookieOptions {
  return { ...sessionCookieOptions(), maxAge: SESSION_TTL_SECONDS * 1000 };
}
