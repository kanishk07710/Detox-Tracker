/** repositories/prismaGoalRepository.ts — Postgres implementation of GoalRepository. */
import { Prisma, type PrismaClient } from '@prisma/client';
import { DuplicateGoalError, type Goal, type GoalRepository, type NewGoal } from './goalRepository';

export function createPrismaGoalRepository(prisma: PrismaClient): GoalRepository {
  return {
    async listByUser(userId: string): Promise<Goal[]> {
      return prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    },

    async create(userId: string, data: NewGoal): Promise<Goal> {
      try {
        return await prisma.goal.create({ data: { userId, ...data } });
      } catch (e) {
        // P2002 = unique constraint violated. Relying on the DB constraint (not a
        // "check then insert") means two simultaneous requests cannot both succeed.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new DuplicateGoalError();
        }
        throw e;
      }
    },

    async delete(userId: string, id: string): Promise<boolean> {
      // deleteMany with userId in the filter: other users' goals simply match 0 rows.
      const { count } = await prisma.goal.deleteMany({ where: { id, userId } });
      return count > 0;
    },
  };
}
