/**
 * middleware/errorHandler.ts — 404 handler + the central error handler.
 *
 * Every failure leaves the API in ONE shape: { error: { code, message, details? } }.
 * Clients (and our frontend) can then handle errors uniformly.
 */

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, notFound } from '../lib/AppError';

// Runs when no route matched. Registered after all routes, before the error handler.
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`Route ${req.method} ${req.path} not found.`));
};

// Express recognises error handlers by their 4-argument signature, so keep `_next`.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  void _next;

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Malformed JSON body: express.json() throws a SyntaxError with status 400.
  if (err instanceof SyntaxError && (err as { status?: number }).status === 400) {
    res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON.' } });
    return;
  }

  // Anything else is an unexpected bug. Log the details server-side, but NEVER leak
  // stack traces or internals to the client.
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
};
