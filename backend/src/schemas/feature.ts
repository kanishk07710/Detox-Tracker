/**
 * schemas/feature.ts — Zod schemas for dashboard, goals, sessions, analytics.
 */
import { z } from 'zod';
import { activitySchema } from './log';
import { isValidDayKey, isValidTimeZone } from '../lib/time';

// IANA timezone from the query string. Invalid -> 400 (never silently guess:
// a wrong tz would put logs on the wrong day, which is a subtle bug).
// Defaults to UTC when omitted so simple clients still work.
export const tzSchema = z
  .string()
  .refine(isValidTimeZone, { message: 'Must be a valid IANA timezone, e.g. Asia/Kolkata' })
  .default('UTC');

export const dayKeySchema = z
  .string()
  .refine(isValidDayKey, { message: 'Must be a real date formatted YYYY-MM-DD' });

export const dashboardQuerySchema = z.object({
  date: dayKeySchema.optional(), // omitted -> "today" in tz
  tz: tzSchema,
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const createGoalSchema = z.object({
  activity: activitySchema,
  type: z.enum(['TARGET', 'LIMIT']),
  minutes: z.number().int().min(1).max(1440),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const startSessionSchema = z.object({ activity: activitySchema });
export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const analyticsQuerySchema = z.object({
  range: z.enum(['week', 'month']),
  tz: tzSchema,
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
