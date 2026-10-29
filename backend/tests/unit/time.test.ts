import { describe, it, expect } from 'vitest';
import { toDayKey, startOfDay, dayBounds, addDays, lastNDays, isValidTimeZone, isValidDayKey } from '../../src/lib/time';

describe('time helpers', () => {
  it('validates timezones', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });

  it('validates day keys as real dates', () => {
    expect(isValidDayKey('2024-02-29')).toBe(true);
    expect(isValidDayKey('2023-02-29')).toBe(false);
    expect(isValidDayKey('2024-2-1')).toBe(false);
  });

  it('buckets the same instant into different days per timezone', () => {
    const t = new Date('2024-03-10T20:00:00Z');
    expect(toDayKey(t, 'UTC')).toBe('2024-03-10');
    expect(toDayKey(t, 'Asia/Kolkata')).toBe('2024-03-11'); // 01:30 next day
    expect(toDayKey(t, 'America/Los_Angeles')).toBe('2024-03-10');
  });

  it('handles the midnight boundary exactly', () => {
    // Kolkata midnight = 18:30Z the day before.
    expect(toDayKey(new Date('2024-05-01T18:29:59Z'), 'Asia/Kolkata')).toBe('2024-05-01');
    expect(toDayKey(new Date('2024-05-01T18:30:00Z'), 'Asia/Kolkata')).toBe('2024-05-02');
  });

  it('startOfDay is the inverse of toDayKey at the boundary', () => {
    const s = startOfDay('2024-05-02', 'Asia/Kolkata');
    expect(s.toISOString()).toBe('2024-05-01T18:30:00.000Z');
    expect(toDayKey(s, 'Asia/Kolkata')).toBe('2024-05-02');
    expect(toDayKey(new Date(s.getTime() - 1), 'Asia/Kolkata')).toBe('2024-05-01');
  });

  it('DST spring forward: local day is 23 hours long', () => {
    const { start, end } = dayBounds('2024-03-10', 'America/New_York');
    expect(start.toISOString()).toBe('2024-03-10T05:00:00.000Z');
    expect(end.toISOString()).toBe('2024-03-11T04:00:00.000Z');
    expect((end.getTime() - start.getTime()) / 3600000).toBe(23);
  });

  it('DST fall back: local day is 25 hours long', () => {
    const { start, end } = dayBounds('2024-11-03', 'America/New_York');
    expect((end.getTime() - start.getTime()) / 3600000).toBe(25);
  });

  it('adds days across month/year/leap boundaries', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2023-12-31', 1)).toBe('2024-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('lists the last N days oldest first', () => {
    expect(lastNDays('2024-03-02', 3)).toEqual(['2024-02-29', '2024-03-01', '2024-03-02']);
  });
});
