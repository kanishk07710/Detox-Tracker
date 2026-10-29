/**
 * config/env.ts — Environment variable validation.
 *
 * WHY we validate env vars at startup:
 *   - If a required variable is missing, the server crashes immediately with a
 *     clear message. This is better than crashing later with a cryptic error
 *     deep inside a database call.
 *   - Zod gives us type-safe access to env vars everywhere else in the codebase.
 *
 * HOW it works:
 *   - We define a schema with Zod.
 *   - We parse process.env against that schema.
 *   - If parsing fails, we print the error and exit with code 1.
 *   - We export the validated `env` object — import THIS everywhere, not process.env directly.
 */

import { z } from 'zod';

// Define the shape and types of all required environment variables.
const envSchema = z.object({
  // "development" | "production" | "test" — coerced to one of these three.
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // The port the server listens on. Defaults to 4000 for local dev.
  // Render injects PORT automatically in production.
  PORT: z.coerce.number().default(4000),

  // The exact frontend origin string, e.g. "http://localhost:3000"
  // Used by the CORS middleware to allow cross-origin requests with credentials.
  FRONTEND_ORIGIN: z.string().url('FRONTEND_ORIGIN must be a valid URL'),

  // Long random secret used to sign session tokens.
  // In Phase 6, this will be used by the session middleware.
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // Postgres connection strings (Phase 5). OPTIONAL on purpose: when DATABASE_URL
  // is unset the app falls back to in-memory repositories (handy for unit tests
  // and first-run dev with no database).
  // DATABASE_URL = pooled (app); DIRECT_URL = direct (migrations only).
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
});

// Parse and validate. If invalid, log the errors and stop the process.
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1); // Crash early with a clear message
}

// Export the validated env object.
// TypeScript knows the exact types: env.PORT is `number`, env.NODE_ENV is a union, etc.
export const env = parsed.data;
