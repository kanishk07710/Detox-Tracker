import { describe, it, expect } from 'vitest';
import { computeStreak, dayQualifies, isGoalMet } from '../../src/services/streak';
import { toDayKey } from '../../src/lib/time';

const zero = { SOCIAL_MEDIA: 0, CODING: 0, STUDY: 0, EXERCISE: 0, OTHER: 0 };

describe('computeStreak', () => {
  it('no qualifying days -> 0/0', () => {
    expect(computeStreak([], '2024-05-10')).toEqual({ current: 0, longest: 0 });
  });
  it('first day', () => {
    expect(computeStreak(['2024-05-10'], '2024-05-10')).toEqual({ current: 1, longest: 1 });
  });
  it('consecutive days', () => {
    expect(computeStreak(['2024-05-08', '2024-05-09', '2024-05-10'], '2024-05-10')).toEqual({ current: 3, longest: 3 });
  });
  it('a missed day resets current but keeps longest', () => {
    const days = ['2024-05-01', '2024-05-02', '2024-05-03', '2024-05-05', '2024-05-06'];
    expect(computeStreak(days, '2024-05-06')).toEqual({ current: 2, longest: 3 });
  });
  it('today not yet qualified does not break the streak', () => {
    expect(computeStreak(['2024-05-08', '2024-05-09'], '2024-05-10')).toEqual({ current: 2, longest: 2 });
  });
  it('two days without qualifying breaks the streak', () => {
    expect(computeStreak(['2024-05-07', '2024-05-08'], '2024-05-10')).toEqual({ current: 0, longest: 2 });
  });
  it('handles month and year boundaries and duplicates', () => {
    expect(computeStreak(['2023-12-31', '2024-01-01', '2024-01-01'], '2024-01-01')).toEqual({ current: 2, longest: 2 });
  });
  it('ignores future days', () => {
    expect(computeStreak(['2024-05-11'], '2024-05-10')).toEqual({ current: 0, longest: 0 });
  });
  it('midnight boundary: a log at 23:59 vs 00:00 local lands on different days', () => {
    const tz = 'Asia/Kolkata';
    const keys = [new Date('2024-05-01T18:29:59Z'), new Date('2024-05-01T18:30:00Z')].map((d) => toDayKey(d, tz));
    expect(computeStreak(keys, keys[1])).toEqual({ current: 2, longest: 2 });
  });
  it('different timezones give different streaks for the same instants', () => {
    // Two logs 2h apart straddling UTC midnight.
    const instants = [new Date('2024-05-01T23:00:00Z'), new Date('2024-05-02T01:00:00Z')];
    const utcKeys = instants.map((d) => toDayKey(d, 'UTC'));
    const laKeys = instants.map((d) => toDayKey(d, 'America/Los_Angeles'));
    expect(computeStreak(utcKeys, '2024-05-02').current).toBe(2);
    expect(computeStreak(laKeys, '2024-05-01').current).toBe(1); // both on May 1 in LA
  });
  it('is stable across a DST change (calendar math, not 24h blocks)', () => {
    expect(computeStreak(['2024-03-09', '2024-03-10', '2024-03-11'], '2024-03-11').current).toBe(3);
  });
});

describe('dayQualifies', () => {
  const goals = [
    { activity: 'SOCIAL_MEDIA' as const, type: 'LIMIT' as const, minutes: 30 },
    { activity: 'STUDY' as const, type: 'TARGET' as const, minutes: 60 },
  ];
  it('no logs never qualifies, even with only LIMIT goals', () => {
    expect(dayQualifies(zero, [goals[0]], false)).toBe(false);
  });
  it('requires all goals met', () => {
    expect(dayQualifies({ ...zero, STUDY: 60, SOCIAL_MEDIA: 30 }, goals, true)).toBe(true);
    expect(dayQualifies({ ...zero, STUDY: 59 }, goals, true)).toBe(false);
    expect(dayQualifies({ ...zero, STUDY: 60, SOCIAL_MEDIA: 31 }, goals, true)).toBe(false);
  });
  it('with no goals, any logged day qualifies', () => {
    expect(dayQualifies(zero, [], true)).toBe(true);
  });
  it('isGoalMet boundaries', () => {
    expect(isGoalMet(goals[1], 60)).toBe(true);
    expect(isGoalMet(goals[0], 30)).toBe(true);
  });
});
