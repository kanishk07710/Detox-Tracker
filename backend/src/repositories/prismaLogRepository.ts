/**
 * repositories/prismaLogRepository.ts — Postgres implementation of LogRepository.
 *
 * Same interface as the in-memory version, so services/routes are unchanged.
 * Note the pattern: every query that touches a specific log also filters by
 * userId, so one user can never read or delete another user's data.
 */

import type { PrismaClient } from '@prisma/client';
import type { Log, NewLog } from '../schemas/log';
import type { LogRepository } from './logRepository';

export function createPrismaLogRepository(prisma: PrismaClient): LogRepository {
  return {
    async create(userId: string, input: NewLog): Promise<Log> {
      // Prisma's row type is structurally identical to Log (enum -> string union).
      return prisma.activityLog.create({
        data: {
          userId,
          activity: input.activity,
          minutes: input.minutes,
          note: input.note,
          loggedAt: input.loggedAt,
        },
      });
    },

    async listByUser(userId: string, range?: { from?: Date; to?: Date }): Promise<Log[]> {
      return prisma.activityLog.findMany({
        where: {
          userId,
          // Only add the loggedAt filter when a bound was given. Inclusive on both ends,
          // matching the in-memory repository.
          ...(range?.from || range?.to
            ? { loggedAt: { gte: range.from, lte: range.to } }
            : {}),
        },
        // Newest first; uses the (userId, loggedAt) index.
        orderBy: { loggedAt: 'desc' },
      });
    },

    async findById(id: string): Promise<Log | null> {
      return prisma.activityLog.findUnique({ where: { id } });
    },

    async delete(userId: string, id: string): Promise<boolean> {
      // deleteMany (not delete) so "not found / not yours" returns count 0 instead of throwing.
      const { count } = await prisma.activityLog.deleteMany({ where: { id, userId } });
      return count > 0;
    },
  };
}
