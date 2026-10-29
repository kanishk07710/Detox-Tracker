/**
 * middleware/requestLogger.ts — One log line per request: method, path, status, ms.
 *
 * WHY hand-rolled: it is ~10 lines and teaches how `res.on('finish')` works, so we
 * avoid a dependency (morgan). We log only the path (no query/body) so secrets never
 * end up in logs. Silent under test to keep test output readable.
 */

import type { RequestHandler } from 'express';
import { env } from '../config/env';

export const requestLogger: RequestHandler = (req, res, next) => {
  if (env.NODE_ENV === 'test') return next();
  const start = Date.now();
  // 'finish' fires once the response has been sent, so we know the final status.
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
};
