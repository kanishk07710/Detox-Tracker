/**
 * middleware/validate.ts — Validates req.body or req.query against a Zod schema.
 *
 * WHY at the edge: handlers and services can then trust their input. Bad input is
 * rejected with a consistent 400 before any business logic runs.
 *
 * On success the PARSED value replaces the raw one, so Zod's coercions/defaults
 * are what the handler sees.
 */

import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { validationError } from '../lib/AppError';

export const validate =
  (schema: ZodTypeAny, source: 'body' | 'query' = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      // Flatten Zod issues into a small, client-friendly list: which field + why.
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(validationError('Request validation failed.', details));
    }
    // Express 4 lets us reassign; Express 5 makes req.query read-only (revisit on upgrade).
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
