/**
 * repositories/logRepository.ts — The persistence "seam" for logs.
 *
 * WHY an interface: services depend on THIS contract, not on a storage engine.
 * Phase 4-5 adds a Prisma implementation; services and routes don't change.
 * Every query takes userId so one user can never touch another user's data.
 */

import { randomUUID } from 'node:crypto';
import type { Log, NewLog } from '../schemas/log';

export interface LogRepository {
  create(userId: string, input: NewLog): Promise<Log>;
  listByUser(userId: string, range?: { from?: Date; to?: Date }): Promise<Log[]>;
  findById(id: string): Promise<Log | null>;
  // Returns true if a log owned by userId was deleted, false otherwise.
  delete(userId: string, id: string): Promise<boolean>;
}

// Factory so tests can get a fresh, isolated store each time.
export function createMemoryLogRepository(): LogRepository & { clear(): void } {
  const logs = new Map<string, Log>();

  return {
    async create(userId, input) {
      const log: Log = { id: randomUUID(), userId, ...input, createdAt: new Date() };
      logs.set(log.id, log);
      return log;
    },
    async listByUser(userId, range) {
      return [...logs.values()]
        .filter((l) => l.userId === userId)
        .filter((l) => !range?.from || l.loggedAt >= range.from)
        .filter((l) => !range?.to || l.loggedAt <= range.to)
        // Newest first: what a "recent activity" UI wants.
        .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime());
    },
    async findById(id) {
      return logs.get(id) ?? null;
    },
    async delete(userId, id) {
      const log = logs.get(id);
      if (!log || log.userId !== userId) return false;
      return logs.delete(id);
    },
    clear() {
      logs.clear();
    },
  };
}

// The shared instance used by the app until the database arrives (Phase 4-5).
export const memoryLogRepository = createMemoryLogRepository();
