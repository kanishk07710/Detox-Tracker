/**
 * services/logService.ts — Business logic for logs. No Express, no HTTP.
 *
 * Takes a repository as a parameter (dependency injection) so unit tests can use a
 * fresh in-memory store and Phase 5 can pass a Prisma-backed one.
 */

import { notFound } from '../lib/AppError';
import type { LogRepository } from '../repositories/logRepository';
import type { CreateLogInput, Log } from '../schemas/log';

export function createLogService(repo: LogRepository) {
  return {
    createLog(userId: string, input: CreateLogInput): Promise<Log> {
      return repo.create(userId, {
        activity: input.activity,
        minutes: input.minutes,
        note: input.note ?? null,
        loggedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
      });
    },

    listLogs(userId: string, range: { from?: string; to?: string } = {}): Promise<Log[]> {
      return repo.listByUser(userId, {
        from: range.from ? new Date(range.from) : undefined,
        to: range.to ? new Date(range.to) : undefined,
      });
    },

    async deleteLog(userId: string, id: string): Promise<void> {
      const deleted = await repo.delete(userId, id);
      // Same 404 whether the id does not exist or belongs to someone else, so we
      // never reveal that another user's log exists.
      if (!deleted) throw notFound('Log not found.');
    },
  };
}

export type LogService = ReturnType<typeof createLogService>;

// Convert internal Dates to the ISO strings the API contract promises.
export function serializeLog(log: Log) {
  return {
    id: log.id,
    userId: log.userId,
    activity: log.activity,
    minutes: log.minutes,
    note: log.note,
    loggedAt: log.loggedAt.toISOString(),
    createdAt: log.createdAt.toISOString(),
  };
}
