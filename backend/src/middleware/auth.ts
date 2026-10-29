/**
 * middleware/auth.ts — requireAuth.
 *
 * Reads the signed session cookie, verifies it, and sets req.user.
 * Handlers behind it must scope every query by req.user.id (ownership check).
 */
import type { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE_NAME } from '../lib/sessionCookie';
import { verifySessionToken } from '../services/authService';
import { AppError } from '../lib/AppError';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];
  const user = typeof token === 'string' ? verifySessionToken(token) : null;
  if (!user) {
    // Same message whether cookie is missing, expired or tampered: reveals nothing.
    next(new AppError('UNAUTHENTICATED', 'Authentication required'));
    return;
  }
  req.user = user;
  next();
}
