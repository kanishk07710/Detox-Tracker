/**
 * routes/auth.ts — register / login / logout / me. Thin HTTP layer over authService.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sessionCookieOptions, sessionCookieWithMaxAge, SESSION_COOKIE_NAME } from '../lib/sessionCookie';
import { getUserRepository } from '../repositories/userRepositoryProvider';
import { loginSchema, registerSchema } from '../schemas/auth';
import type { LoginInput, RegisterInput } from '../schemas/auth';
import * as authService from '../services/authService';

export const AUTH_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 };

// Brute-force / credential-stuffing protection. Per IP (needs `trust proxy` on Render,
// otherwise every request appears to come from the proxy). Only auth routes: normal
// API use shouldn't be throttled this hard. Skipped under test so suites can't trip it,
// except the dedicated rate-limit test which sets AUTH_RATE_LIMIT_ENABLED.
const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT.windowMs,
  limit: AUTH_RATE_LIMIT.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' && process.env.AUTH_RATE_LIMIT_ENABLED !== '1',
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' },
    });
  },
});

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.register(getUserRepository(), req.body as RegisterInput);
    // Log the user in immediately so signup doesn't need a second round trip.
    res.cookie(SESSION_COOKIE_NAME, authService.signSessionToken(user), sessionCookieWithMaxAge());
    res.status(201).json({ user });
  })
);

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.login(getUserRepository(), req.body as LoginInput);
    res.cookie(SESSION_COOKIE_NAME, authService.signSessionToken(user), sessionCookieWithMaxAge());
    res.json({ user });
  })
);

// Idempotent and unauthenticated on purpose: logging out with an expired cookie should still clear it.
authRouter.post('/logout', (_req, res) => {
  // clearCookie must use the same attributes (sameSite/secure/path) as set, or browsers ignore it.
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
  res.status(204).send();
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Re-check the user still exists (e.g. account deleted after token was issued).
    const user = await getUserRepository().findById(req.user!.id);
    if (!user) {
      res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      return;
    }
    res.json({ user: { id: user.id, email: user.email } });
  })
);
