/**
 * lib/prisma.ts — one shared PrismaClient for the whole process.
 *
 * WHY a singleton: each PrismaClient opens its own connection pool. Creating
 * one per request (or per file) would exhaust the database's connection limit
 * quickly — especially on Supabase's free tier.
 *
 * WHY the globalThis cache: in dev, `tsx watch` re-evaluates modules on each
 * reload; without the cache every reload would leak a new pool.
 *
 * This file deliberately does NOT import config/env.ts: Prisma reads
 * DATABASE_URL from the environment by itself, and keeping env out of here lets
 * integration tests use it without the full app configuration.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
