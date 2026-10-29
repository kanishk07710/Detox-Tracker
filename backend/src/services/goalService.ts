/** services/goalService.ts — goal CRUD. One goal per (user, activity, type). */
import { AppError, notFound } from '../lib/AppError';
import { DuplicateGoalError, type Goal, type GoalRepository } from '../repositories/goalRepository';
import type { CreateGoalInput } from '../schemas/feature';

export function createGoalService(repo: GoalRepository) {
  return {
    list: (userId: string) => repo.listByUser(userId),

    async create(userId: string, input: CreateGoalInput): Promise<Goal> {
      try {
        return await repo.create(userId, input);
      } catch (e) {
        // Translate the storage-level error into an HTTP-level one here, so
        // repositories stay free of HTTP concepts.
        if (e instanceof DuplicateGoalError) {
          throw new AppError('CONFLICT', 'You already have a goal of this type for this activity.');
        }
        throw e;
      }
    },

    async remove(userId: string, id: string): Promise<void> {
      // 404 for both "missing" and "someone else's": never confirm other users' ids exist.
      if (!(await repo.delete(userId, id))) throw notFound('Goal not found.');
    },
  };
}

export const serializeGoal = (g: Goal) => ({
  id: g.id,
  activity: g.activity,
  type: g.type,
  minutes: g.minutes,
  createdAt: g.createdAt.toISOString(),
});
