/** services/analyticsService.ts — zero-filled per-day totals for charts. */
import type { LogRepository } from '../repositories/logRepository';
import { dayBounds, lastNDays, startOfDay, toDayKey } from '../lib/time';
import { emptyTotals, type Totals } from './dashboardService';

const RANGE_DAYS = { week: 7, month: 30 } as const;

export function createAnalyticsService(logs: LogRepository, now: () => Date = () => new Date()) {
  return {
    async summary(userId: string, range: keyof typeof RANGE_DAYS, tz: string) {
      // The range ends today (in the user's tz) and includes today.
      const days = lastNDays(toDayKey(now(), tz), RANGE_DAYS[range]);
      const rows = await logs.listByUser(userId, {
        from: startOfDay(days[0], tz),
        to: new Date(dayBounds(days[days.length - 1], tz).end.getTime() - 1),
      });

      // Pre-create every day so quiet days appear as zeros (charts need no gaps).
      const buckets = new Map<string, Totals>(days.map((d) => [d, emptyTotals()]));
      for (const log of rows) {
        const bucket = buckets.get(toDayKey(log.loggedAt, tz));
        if (bucket) bucket[log.activity] += log.minutes;
      }
      return {
        range,
        days: days.map((date) => ({ date, totalsByActivity: buckets.get(date) as Totals })),
      };
    },
  };
}
