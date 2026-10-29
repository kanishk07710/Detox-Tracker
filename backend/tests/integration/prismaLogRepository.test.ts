/**
 * Integration test: PrismaLogRepository against a REAL Postgres.
 *
 * Runs only when DATABASE_URL is set (CI provides a Postgres service container
 * and runs `prisma migrate deploy` first). Locally with no DB it is skipped, so
 * `npm test` stays green. NEVER point DATABASE_URL at production for this test:
 * it deletes rows.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createPrismaLogRepository } from '../../src/repositories/prismaLogRepository';

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('prismaLogRepository (needs DATABASE_URL)', () => {
  let prisma: PrismaClient;
  let repo: ReturnType<typeof createPrismaLogRepository>;
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    repo = createPrismaLogRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Cascade removes the users' logs too.
    await prisma.user.deleteMany({ where: { email: { endsWith: '@repo-test.local' } } });
    const stamp = Date.now();
    userA = (await prisma.user.create({ data: { email: `a${stamp}@repo-test.local`, passwordHash: 'x' } })).id;
    userB = (await prisma.user.create({ data: { email: `b${stamp}@repo-test.local`, passwordHash: 'x' } })).id;
  });

  it('persists a log and reads it back', async () => {
    const created = await repo.create(userA, {
      activity: 'CODING',
      minutes: 30,
      note: null,
      loggedAt: new Date('2026-01-01T10:00:00Z'),
    });
    expect(created.id).toBeTruthy();
    expect(await repo.findById(created.id)).toMatchObject({ userId: userA, minutes: 30, note: null });
  });

  it('lists only the user\'s logs, newest first, filtered by range', async () => {
    const mk = (u: string, d: string) =>
      repo.create(u, { activity: 'STUDY', minutes: 10, note: null, loggedAt: new Date(d) });
    await mk(userA, '2026-01-01T00:00:00Z');
    await mk(userA, '2026-01-03T00:00:00Z');
    await mk(userB, '2026-01-02T00:00:00Z');

    const all = await repo.listByUser(userA);
    expect(all.map((l) => l.loggedAt.toISOString())).toEqual([
      '2026-01-03T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    ]);
    const ranged = await repo.listByUser(userA, { from: new Date('2026-01-02T00:00:00Z') });
    expect(ranged).toHaveLength(1);
  });

  it('delete is scoped to the owner', async () => {
    const log = await repo.create(userA, {
      activity: 'OTHER', minutes: 5, note: null, loggedAt: new Date(),
    });
    expect(await repo.delete(userB, log.id)).toBe(false);
    expect(await repo.findById(log.id)).not.toBeNull();
    expect(await repo.delete(userA, log.id)).toBe(true);
    expect(await repo.findById(log.id)).toBeNull();
  });

  it('the database itself rejects minutes outside 1..1440 (CHECK constraint)', async () => {
    await expect(
      repo.create(userA, { activity: 'CODING', minutes: 0, note: null, loggedAt: new Date() }),
    ).rejects.toThrow();
    await expect(
      repo.create(userA, { activity: 'CODING', minutes: 1441, note: null, loggedAt: new Date() }),
    ).rejects.toThrow();
  });

  it('deleting a user cascades to their logs', async () => {
    const log = await repo.create(userA, {
      activity: 'CODING', minutes: 5, note: null, loggedAt: new Date(),
    });
    await prisma.user.delete({ where: { id: userA } });
    expect(await repo.findById(log.id)).toBeNull();
  });
});
