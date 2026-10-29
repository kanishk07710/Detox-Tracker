/**
 * repositories/index.ts — picks the storage engine for logs.
 *
 * Postgres (Prisma) when DATABASE_URL is set, in-memory otherwise. Routes call
 * getLogRepository() instead of importing a concrete implementation, so the
 * switch happens in exactly one place.
 *
 * Prisma is loaded lazily (require inside the branch) so running without a
 * database never even constructs a PrismaClient.
 */

import { env } from '../config/env';
import { memoryLogRepository, type LogRepository } from './logRepository';

let cached: LogRepository | undefined;

export function getLogRepository(): LogRepository {
  if (cached) return cached;

  // NODE_ENV=test keeps HTTP-level tests on the fast in-memory repo even when CI
  // provides DATABASE_URL; the Prisma repo is tested directly in tests/integration.
  if (env.DATABASE_URL && env.NODE_ENV !== 'test') {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { prisma } = require('../lib/prisma') as typeof import('../lib/prisma');
    const { createPrismaLogRepository } =
      require('./prismaLogRepository') as typeof import('./prismaLogRepository');
    /* eslint-enable @typescript-eslint/no-var-requires */
    cached = createPrismaLogRepository(prisma);
  } else {
    cached = memoryLogRepository;
  }
  return cached;
}

// ── Phase 8: goals and focus sessions (same pattern as logs) ────────────────

import { createMemoryGoalRepository, type GoalRepository } from './goalRepository';
import { createMemorySessionRepository, type SessionRepository } from './sessionRepository';

const memoryGoalRepository = createMemoryGoalRepository();
const memorySessionRepository = createMemorySessionRepository();
let cachedGoals: GoalRepository | undefined;
let cachedSessions: SessionRepository | undefined;

const usePrisma = () => Boolean(env.DATABASE_URL) && env.NODE_ENV !== 'test';

export function getGoalRepository(): GoalRepository {
  if (cachedGoals) return cachedGoals;
  if (usePrisma()) {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { prisma } = require('../lib/prisma') as typeof import('../lib/prisma');
    const m = require('./prismaGoalRepository') as typeof import('./prismaGoalRepository');
    /* eslint-enable @typescript-eslint/no-var-requires */
    cachedGoals = m.createPrismaGoalRepository(prisma);
  } else cachedGoals = memoryGoalRepository;
  return cachedGoals;
}

export function getSessionRepository(): SessionRepository {
  if (cachedSessions) return cachedSessions;
  if (usePrisma()) {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { prisma } = require('../lib/prisma') as typeof import('../lib/prisma');
    const m = require('./prismaSessionRepository') as typeof import('./prismaSessionRepository');
    /* eslint-enable @typescript-eslint/no-var-requires */
    cachedSessions = m.createPrismaSessionRepository(prisma);
  } else cachedSessions = memorySessionRepository;
  return cachedSessions;
}
