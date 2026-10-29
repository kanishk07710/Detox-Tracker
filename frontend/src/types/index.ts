/**
 * types/index.ts — Shared TypeScript types mirroring the backend API shapes.
 * Keep in sync with the backend contract (docs/api).
 */

// Must match the backend Zod schema and Prisma enum.
export type Activity = 'SOCIAL_MEDIA' | 'CODING' | 'STUDY' | 'EXERCISE' | 'OTHER';

export const ACTIVITIES: Activity[] = ['SOCIAL_MEDIA', 'CODING', 'STUDY', 'EXERCISE', 'OTHER'];

export interface User {
  id: string;
  email: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  activity: Activity;
  minutes: number;
  note: string | null;
  loggedAt: string; // ISO string
  createdAt: string;
}

export interface CreateLogInput {
  activity: Activity;
  minutes: number;
  note?: string;
  loggedAt?: string;
}

export type GoalType = 'TARGET' | 'LIMIT';

export interface Goal {
  id: string;
  activity: Activity;
  type: GoalType;
  minutes: number;
}

export interface GoalProgress {
  goalId: string;
  activity: Activity;
  type: GoalType;
  minutes: number;
  progressMinutes: number;
  met: boolean;
}

export type Totals = Record<Activity, number>;

export interface Dashboard {
  date: string;
  totals: Partial<Totals>;
  goals: GoalProgress[];
  streak: { current: number; longest: number };
}

export interface FocusSession {
  id: string;
  activity: Activity;
  startedAt: string;
  endedAt?: string;
  minutes?: number;
}

export interface AnalyticsDay {
  date: string;
  totalsByActivity: Partial<Totals>;
}

export interface Analytics {
  range: 'week' | 'month';
  days: AnalyticsDay[];
}
