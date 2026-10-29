/**
 * tests/setup.ts — Runs before every test file (see vitest.config.ts).
 *
 * config/env.ts calls process.exit(1) when required variables are missing, which would
 * kill the test runner. So we set safe, fake values BEFORE any app code is imported.
 * These are test-only dummies, not real secrets.
 */

process.env.NODE_ENV = 'test';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.SESSION_SECRET = 'test-only-secret-that-is-at-least-32-characters-long';
