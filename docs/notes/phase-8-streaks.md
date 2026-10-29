# Phase 8 — Streak rules (chosen because no PRD exists in the repo)

The docs mention `PRD.md` (FR-6) but that file is not in the repo, so these are the simplest rules that satisfy ARCHITECTURE.md section 7.

## What is a "streak day"?

A day (a calendar date in the user's IANA timezone) qualifies when BOTH hold:

1. The user logged at least one entry that day. "No data" is never success, even if the user only has a LIMIT goal (0 minutes of social media because they did not use the app is not a win).
2. Every goal the user currently has is met that day:
   - TARGET goal: minutes logged for that activity >= goal minutes
   - LIMIT goal: minutes logged for that activity <= goal minutes

With no goals at all, any day with a log qualifies.

## Streak numbers

- `longest`: longest run of consecutive qualifying days in the last 365 days.
- `current`: run of consecutive qualifying days ending today. If today has not qualified yet, the run ending yesterday still counts, because today is still in progress. Missing yesterday AND today gives 0.

## Simplifications to know about

- One streak per user (not per goal as `GET /api/streaks` in ARCHITECTURE.md suggested). The dashboard returns it as `streak: {current, longest}`.
- Past days are judged against the goals as they exist NOW (goal history is not stored). Changing a goal can change old streak days.
- Lookback is 365 days to bound the query.

## Where it lives

- `backend/src/services/streak.ts` - pure functions `computeStreak`, `dayQualifies`, `isGoalMet`. They only see day keys (`YYYY-MM-DD`), never timezones.
- `backend/src/lib/time.ts` - converts UTC instants to day keys in a timezone (Intl API, DST-safe).
- Tests: `backend/tests/unit/streak.test.ts`, `backend/tests/unit/time.test.ts`.
