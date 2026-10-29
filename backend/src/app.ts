/**
 * app.ts — Builds and exports the Express application.
 *
 * WHY this is separate from server.ts:
 *   - Tests can import `app` directly without starting a real HTTP listener.
 *   - server.ts is the only file that calls app.listen().
 *
 * What lives here:
 *   - Middleware registration (CORS, JSON parsing, request logger)
 *   - Route mounting
 *   - Error-handling middleware (must be last)
 *
 * What does NOT live here:
 *   - app.listen() — that's in server.ts
 *   - Business logic — that's in services/
 *   - Database access — that's in lib/ and repositories/
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

const app = express();

// Render (and most PaaS) terminate TLS at a reverse proxy. Trusting ONE hop makes
// req.ip the real client (needed for rate limiting) and req.secure correct.
app.set('trust proxy', 1);

// ── Middleware ─────────────────────────────────────────────────────────────

// Log every request first so even rejected ones are recorded.
app.use(requestLogger);

// helmet sets safe default security headers (nosniff, HSTS, frame protection...).
app.use(helmet());

// Populates req.cookies so requireAuth can read the session cookie.
app.use(cookieParser());

// Parse JSON request bodies.
// Without this, req.body would be undefined for POST/PATCH requests.
app.use(express.json());

// CORS: allow requests only from the configured frontend origin.
// "credentials: true" is needed so cookies are sent cross-origin.
// We never use "*" with credentials — that's blocked by browsers.
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  })
);

// ── Routes ─────────────────────────────────────────────────────────────────

// Health check — unauthenticated, used by Render to verify the service is up.
// Responds with { status: "ok" } and the environment name.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV });
});

// All feature routers live behind /api. Add new ones in routes/index.ts.
app.use('/api', apiRouter);

// ── 404 + error-handling middleware ─────────────────────────────────────────
// Order matters: unmatched requests fall through to the 404 handler, which creates an
// AppError, which falls through to the error handler. Both must be registered LAST.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
