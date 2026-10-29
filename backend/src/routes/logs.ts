/**
 * routes/logs.ts — HTTP layer for activity logs. Thin: parse -> service -> respond.
 */

import { Router } from 'express';
import type { Request } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { getLogRepository } from '../repositories';
import { createLogSchema, listLogsQuerySchema } from '../schemas/log';
import type { CreateLogInput, ListLogsQuery } from '../schemas/log';
import { createLogService, serializeLog } from '../services/logService';

const service = createLogService(getLogRepository());

// requireAuth is mounted in routes/index.ts, so req.user is always set here.
// Every service call is scoped by this id: that is the ownership check.
function currentUserId(req: Request): string {
  return req.user!.id;
}

export const logsRouter = Router();

logsRouter.post(
  '/',
  validate(createLogSchema),
  asyncHandler(async (req, res) => {
    const log = await service.createLog(currentUserId(req), req.body as CreateLogInput);
    res.status(201).json(serializeLog(log));
  })
);

logsRouter.get(
  '/',
  validate(listLogsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const logs = await service.listLogs(currentUserId(req), req.query as ListLogsQuery);
    res.json({ logs: logs.map(serializeLog) });
  })
);

logsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await service.deleteLog(currentUserId(req), req.params.id);
    res.status(204).send();
  })
);
