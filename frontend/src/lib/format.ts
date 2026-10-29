import type { Activity } from '@/types';

export const ACTIVITY_LABEL: Record<Activity, string> = {
  SOCIAL_MEDIA: 'Social media',
  CODING: 'Coding',
  STUDY: 'Study',
  EXERCISE: 'Exercise',
  OTHER: 'Other',
};

export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${r}m` : `${r}m`;
}

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's clock). */
export function localDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
