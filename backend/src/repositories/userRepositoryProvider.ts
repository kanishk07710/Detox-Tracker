/**
 * Chooses the UserRepository implementation (same rule as getLogRepository):
 * Postgres when DATABASE_URL is set, in-memory otherwise and always under test.
 * Users MUST live in the same store as logs, or the logs.userId foreign key breaks.
 * Kept apart from the interface file so importing the interface never pulls in Prisma.
 */
import { env } from '../config/env';
import { memoryUserRepository, type UserRepository } from './userRepository';

let cached: UserRepository | undefined;

export function getUserRepository(): UserRepository {
  if (cached) return cached;
  if (env.DATABASE_URL && env.NODE_ENV !== 'test') {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { prisma } = require('../lib/prisma') as typeof import('../lib/prisma');
    const m = require('./prismaUserRepository') as typeof import('./prismaUserRepository');
    /* eslint-enable @typescript-eslint/no-var-requires */
    cached = m.createPrismaUserRepository(prisma);
  } else {
    cached = memoryUserRepository;
  }
  return cached;
}
