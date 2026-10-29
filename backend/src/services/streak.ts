/**
 * streak.ts — pure streak calculation (no DB, no clock, no timezone code).
 *
 * RULES (see docs/notes/phase-8-streaks.md):
 *  - A "qualifying day" is a day on which the user logged something AND met
 *    every goal they had (see `dayQualifies`).
 *  - current streak = consecutive qualifying days ending today, OR ending
 *    yesterday if today has not qualified yet (the day is still in progress,
 *    so it must not break the streak).
 *  - longest streak = longest consecutive run anywhere in history.
 *
 * Timezone handling happens BEFORE this file: callers bucket logs into
 * day keys using lib/time.ts, so this function only does calendar math.
 */
import { addDays, type DayKey } from '../lib/time';
import type { Activity } from '../schemas/log';

export interface StreakResult {
  current: number;
  longest: number;
}

export interface GoalLike {
  activity: Activity;
  type: 'TARGET' | 'LIMIT';
  minutes: number;
}

/** progress/met rule shared by dashboard and streaks. */
export function isGoalMet(goal: GoalLike, progressMinutes: number): boolean {
  return goal.type === 'TARGET' ? progressMinutes >= goal.minutes : progressMinutes <= goal.minutes;
}

/**
 * Does one day count toward the streak?
 * - No logs at all -> never qualifies ("no data" is not success, even for LIMIT goals).
 * - Otherwise every goal must be met. With no goals, any logged day qualifies.
 */
export function dayQualifies(
  totals: Record<Activity, number>,
  goals: GoalLike[],
  hasLogs: boolean,
): boolean {
  if (!hasLogs) return false;
  return goals.every((g) => isGoalMet(g, totals[g.activity] ?? 0));
}

export function computeStreak(qualifyingDays: Iterable<DayKey>, today: DayKey): StreakResult {
  // Ignore duplicates and anything in the future (e.g. clock skew).
  const set = new Set([...qualifyingDays].filter((d) => d <= today));
  if (set.size === 0) return { current: 0, longest: 0 };

  // Longest run: only start counting at days whose previous day is NOT qualifying.
  let longest = 0;
  for (const day of set) {
    if (set.has(addDays(day, -1))) continue;
    let len = 1;
    while (set.has(addDays(day, len))) len++;
    longest = Math.max(longest, len);
  }

  // Current run: anchor at today if it qualifies, else yesterday (grace for in-progress day).
  let cursor: DayKey | null = set.has(today) ? today : set.has(addDays(today, -1)) ? addDays(today, -1) : null;
  let current = 0;
  while (cursor && set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, longest };
}
