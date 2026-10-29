/**
 * routes/productivity.ts — dashboard, goals, sessions, analytics (Phases 8-9).
 *
 * Thin HTTP layer: validate -> call service -> shape the response.
 * Built as a factory taking its dependencies so tests can inject memory repos and a
 * fake clock. Authentication is applied by the caller (routes/index.ts), and every
 * service call is scoped by req.user.id.
 */
import { Router, type Request } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { AppError } from '../lib/AppError';
import type { LogRepository } from '../repositories/logRepository';
import type { GoalRepository } from '../repositories/goalRepository';
import type { SessionRepository } from '../repositories/sessionRepository';
import {
  analyticsQuerySchema,
  createGoalSchema,
  dashboardQuerySchema,
  startSessionSchema,
  type AnalyticsQuery,
  type CreateGoalInput,
  type DashboardQuery,
  type StartSessionInput,
} from '../schemas/feature';
import { createDashboardService } from '../services/dashboardService';
import { createGoalService, serializeGoal } from '../services/goalService';
import { createSessionService, serializeActive } from '../services/sessionService';
import { createAnalyticsService } from '../services/analyticsService';
import { serializeLog } from '../services/logService';

export interface ProductivityDeps {
  logs: LogRepository;
  goals: GoalRepository;
  sessions: SessionRepository;
  now?: () => Date;
}

// requireAuth guarantees req.user; this guard keeps a mis-mounted router from
// ever running unscoped.
function uid(req: Request): string {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Authentication required');
  return req.user.id;
}

export function createProductivityRouters(deps: ProductivityDeps) {
  const dashboard = createDashboardService(deps.logs, deps.goals, deps.now);
  const goals = createGoalService(deps.goals);
  const sessions = createSessionService(deps.sessions, deps.logs, deps.now);
  const analytics = createAnalyticsService(deps.logs, deps.now);

  const dashboardRouter = Router();
  dashboardRouter.get(
    '/',
    validate(dashboardQuerySchema, 'query'),
    asyncHandler(async (req, res) => {
      const q = req.query as unknown as DashboardQuery;
      res.json(await dashboard.getDashboard(uid(req), q.tz, q.date));
    })
  );

  const goalsRouter = Router();
  goalsRouter.get(
    '/',
    asyncHandler(async (req, res) => {
      res.json({ goals: (await goals.list(uid(req))).map(serializeGoal) });
    })
  );
  goalsRouter.post(
    '/',
    validate(createGoalSchema),
    asyncHandler(async (req, res) => {
      const goal = await goals.create(uid(req), req.body as CreateGoalInput);
      res.status(201).json({ goal: serializeGoal(goal) });
    })
  );
  goalsRouter.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await goals.remove(uid(req), req.params.id);
      res.status(204).send();
    })
  );

  const sessionsRouter = Router();
  sessionsRouter.post(
    '/start',
    validate(startSessionSchema),
    asyncHandler(async (req, res) => {
      const s = await sessions.start(uid(req), (req.body as StartSessionInput).activity);
      res.status(201).json({ session: serializeActive(s) });
    })
  );
  sessionsRouter.get(
    '/active',
    asyncHandler(async (req, res) => {
      const s = await sessions.getActive(uid(req));
      res.json({ session: s ? serializeActive(s) : null });
    })
  );
  sessionsRouter.post(
    '/stop',
    asyncHandler(async (req, res) => {
      const { session, minutes, log } = await sessions.stop(uid(req));
      res.json({
        session: {
          ...serializeActive(session),
          endedAt: session.endedAt?.toISOString(),
          minutes,
        },
        log: serializeLog(log),
      });
    })
  );

  const analyticsRouter = Router();
  analyticsRouter.get(
    '/summary',
    validate(analyticsQuerySchema, 'query'),
    asyncHandler(async (req, res) => {
      const q = req.query as unknown as AnalyticsQuery;
      res.json(await analytics.summary(uid(req), q.range, q.tz));
    })
  );

  return { dashboardRouter, goalsRouter, sessionsRouter, analyticsRouter };
}
