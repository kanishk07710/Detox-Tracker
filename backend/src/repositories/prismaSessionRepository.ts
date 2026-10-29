/** repositories/prismaSessionRepository.ts — Postgres implementation of SessionRepository. */
import { Prisma, type PrismaClient } from '@prisma/client';
import type { Activity } from '../schemas/log';
import {
  ActiveSessionExistsError,
  type FocusSession,
  type SessionRepository,
} from './sessionRepository';

export function createPrismaSessionRepository(prisma: PrismaClient): SessionRepository {
  return {
    async findActive(userId: string): Promise<FocusSession | null> {
      return prisma.focusSession.findFirst({ where: { userId, endedAt: null } });
    },

    async start(userId: string, activity: Activity, startedAt: Date): Promise<FocusSession> {
      try {
        return await prisma.focusSession.create({ data: { userId, activity, startedAt } });
      } catch (e) {
        // The partial unique index "focus_sessions_one_active_per_user" enforces
        // "one running session" even under concurrent requests.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ActiveSessionExistsError();
        }
        throw e;
      }
    },

    async stop(userId: string, endedAt: Date): Promise<FocusSession | null> {
      const active = await prisma.focusSession.findFirst({ where: { userId, endedAt: null } });
      if (!active) return null;
      // updateMany with endedAt: null guards against a double-stop race.
      const { count } = await prisma.focusSession.updateMany({
        where: { id: active.id, userId, endedAt: null },
        data: { endedAt },
      });
      return count > 0 ? { ...active, endedAt } : null;
    },
  };
}
