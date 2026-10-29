/**
 * routes/index.ts — Aggregates every feature router under one `apiRouter`,
 * mounted at /api in app.ts. Adding a feature = one import + one `use` line here.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { authRouter } from './auth';
import { logsRouter } from './logs';
import { createProductivityRouters } from './productivity';
import { getGoalRepository, getLogRepository, getSessionRepository } from '../repositories';

export const apiRouter = Router();

// Public: register/login/logout (me applies requireAuth itself).
apiRouter.use('/auth', authRouter);

// Every non-auth router MUST be mounted behind requireAuth here, so a new feature
// can't accidentally ship unauthenticated.
apiRouter.use('/logs', requireAuth, logsRouter);

// Phase 8-9: dashboard, goals, focus timer, analytics. Repositories come from the
// providers so they follow the same memory/Prisma switch as logs.
const productivity = createProductivityRouters({
  logs: getLogRepository(),
  goals: getGoalRepository(),
  sessions: getSessionRepository(),
});
apiRouter.use('/dashboard', requireAuth, productivity.dashboardRouter);
apiRouter.use('/goals', requireAuth, productivity.goalsRouter);
apiRouter.use('/sessions', requireAuth, productivity.sessionsRouter);
apiRouter.use('/analytics', requireAuth, productivity.analyticsRouter);
