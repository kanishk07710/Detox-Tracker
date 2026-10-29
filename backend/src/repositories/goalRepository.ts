/**
 * goalRepository.ts — the "seam" between goal business logic and storage.
 * Services depend on this interface only; tests use the memory implementation,
 * production uses the Prisma one (prismaGoalRepository.ts).
 */
import { randomUUID } from 'node:crypto';
import type { Activity } from '../schemas/log';

export type GoalType = 'TARGET' | 'LIMIT';

export interface Goal {
  id: string;
  userId: string;
  activity: Activity;
  type: GoalType;
  minutes: number;
  createdAt: Date;
}

export interface NewGoal {
  activity: Activity;
  type: GoalType;
  minutes: number;
}

/** Thrown when (user, activity, type) already has a goal. Services map it to 409. */
export class DuplicateGoalError extends Error {
  constructor() {
    super('Goal already exists for this activity and type');
  }
}

export interface GoalRepository {
  listByUser(userId: string): Promise<Goal[]>;
  /** @throws DuplicateGoalError */
  create(userId: string, data: NewGoal): Promise<Goal>;
  /** Scoped by userId: someone else's goal behaves as "not found" (false). */
  delete(userId: string, id: string): Promise<boolean>;
}

export function createMemoryGoalRepository(): GoalRepository & { clear(): void } {
  let goals: Goal[] = [];
  return {
    async listByUser(userId) {
      return goals.filter((g) => g.userId === userId);
    },
    async create(userId, data) {
      if (goals.some((g) => g.userId === userId && g.activity === data.activity && g.type === data.type)) {
        throw new DuplicateGoalError();
      }
      const goal: Goal = { id: randomUUID(), userId, ...data, createdAt: new Date() };
      goals.push(goal);
      return goal;
    },
    async delete(userId, id) {
      const before = goals.length;
      goals = goals.filter((g) => !(g.id === id && g.userId === userId));
      return goals.length < before;
    },
    clear() {
      goals = [];
    },
  };
}
