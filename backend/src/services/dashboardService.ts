/**
 * services/dashboardService.ts — today's totals, goal progress and streaks.
 * No HTTP here; repositories and the clock are injected for easy testing.
 */
import { ACTIVITIES, type Activity, type Log } from '../schemas/log';
import type { LogRepository } from '../repositories/logRepository';
import type { GoalRepository } from '../repositories/goalRepository';
import { addDays, dayBounds, startOfDay, toDayKey, type DayKey } from '../lib/time';
import { computeStreak, dayQualifies, isGoalMet } from './streak';

export type Totals = Record<Activity, number>;

/** All five keys always present, so the frontend never checks for undefined. */
export function emptyTotals(): Totals {
  return Object.fromEntries(ACTIVITIES.map((a) => [a, 0])) as Totals;
}

// How far back streaks look. Bounds the query; longer streaks are capped at ~366.
const STREAK_LOOKBACK_DAYS = 365;

export function createDashboardService(
  logs: LogRepository,
  goals: GoalRepository,
  now: () => Date = () => new Date()
) {
  return {
    async getDashboard(userId: string, tz: string, date?: DayKey) {
      const today = date ?? toDayKey(now(), tz);
      const [allGoals, history] = await Promise.all([
        goals.listByUser(userId),
        logs.listByUser(userId, {
          from: startOfDay(addDays(today, -STREAK_LOOKBACK_DAYS), tz),
          to: new Date(dayBounds(today, tz).end.getTime() - 1),
        }),
      ]);

      // Bucket every log into its local day (UTC instant -> user's calendar day).
      const byDay = new Map<DayKey, { totals: Totals; logs: Log[] }>();
      for (const log of history) {
        const key = toDayKey(log.loggedAt, tz);
        const bucket = byDay.get(key) ?? { totals: emptyTotals(), logs: [] };
        bucket.totals[log.activity] += log.minutes;
        bucket.logs.push(log);
        byDay.set(key, bucket);
      }

      const totals = byDay.get(today)?.totals ?? emptyTotals();

      // Streak days are judged against the CURRENT goals (see docs/notes/phase-8-streaks.md).
      const qualifying: DayKey[] = [];
      for (const [key, b] of byDay) {
        if (dayQualifies(b.totals, allGoals, b.logs.length > 0)) qualifying.push(key);
      }

      return {
        date: today,
        totals,
        goals: allGoals.map((g) => {
          const progressMinutes = totals[g.activity];
          return {
            goalId: g.id,
            activity: g.activity,
            type: g.type,
            minutes: g.minutes,
            progressMinutes,
            met: isGoalMet(g, progressMinutes),
          };
        }),
        streak: computeStreak(qualifying, today),
      };
    },
  };
}
