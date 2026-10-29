/**
 * lib/AppError.ts — An error we throw ON PURPOSE for expected failures.
 *
 * WHY a custom class:
 *   - Anything that is not an AppError is a bug (500). Anything that IS an AppError
 *     already knows its HTTP status and machine-readable code, so the central error
 *     handler can turn it into the standard JSON shape without a giant if/else.
 *   - Services throw `notFound()` etc. and never touch `res` — they stay HTTP-agnostic.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

// One place that maps each code to its HTTP status, so they can never drift apart.
const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  // Optional extra info, e.g. the list of invalid fields for validation errors.
  readonly details?: unknown[];

  constructor(code: ErrorCode, message: string, details?: unknown[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

// Small factories keep call sites short and readable: `throw notFound('Log not found')`.
export const notFound = (message = 'Resource not found.') => new AppError('NOT_FOUND', message);
export const validationError = (message: string, details?: unknown[]) =>
  new AppError('VALIDATION_ERROR', message, details);
