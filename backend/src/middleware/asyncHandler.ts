/**
 * middleware/asyncHandler.ts — Lets async route handlers throw safely.
 *
 * WHY: Express 4 does NOT catch rejected promises from async handlers. Without this
 * wrapper a thrown AppError would hang the request (or crash the process). We
 * forward any rejection to `next(err)` so the central error handler sees it.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
