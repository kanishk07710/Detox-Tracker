/**
 * Integration tests for dashboard / goals / sessions / analytics.
 *
 * We mount ONLY our routers on a tiny Express app with a fake auth middleware
 * (user id taken from the x-test-user header) so these tests stay independent of
 * the auth implementation, which has its own tests. The clock is injected, so
 * "now" is deterministic.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createProductivityRouters } from '../../src/routes/productivity';
import { createMemoryLogRepository } from '../../src/repositories/logRepository';
import { createMemoryGoalRepository } from '../../src/repositories/goalRepository';
import { createMemorySessionRepository } from '../../src/repositories/sessionRepository';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorHandler';

const logs = createMemoryLogRepository();
const goalsRepo = createMemoryGoalRepository();
const sessionsRepo = createMemorySessionRepository();
let nowMs = Date.parse('2024-05-10T12:00:00Z');

function buildApp() {
  const r = createProductivityRouters({
    logs,
    goals: goalsRepo,
    sessions: sessionsRepo,
    now: () => new Date(nowMs),
  });
  const app = express();
  app.use(express.json());
  const fakeAuth: express.RequestHandler = (req, res, next) => {
    const id = req.header('x-test-user');
    if (!id) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'no' } });
      return;
    }
    req.user = { id, email: `${id}@example.com` };
    next();
  };
  app.use('/api/dashboard', fakeAuth, r.dashboardRouter);
  app.use('/api/goals', fakeAuth, r.goalsRouter);
  app.use('/api/sessions', fakeAuth, r.sessionsRouter);
  app.use('/api/analytics', fakeAuth, r.analyticsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
const app = buildApp();
const as = (u: string) => ({ 'x-test-user': u });

beforeEach(() => {
  logs.clear();
  goalsRepo.clear();
  sessionsRepo.clear();
  nowMs = Date.parse('2024-05-10T12:00:00Z');
});

const addLog = (
  userId: string,
  activity: 'CODING' | 'SOCIAL_MEDIA' | 'STUDY',
  minutes: number,
  at: string
) => logs.create(userId, { activity, minutes, note: null, loggedAt: new Date(at) });

describe('auth + validation', () => {
  it('rejects unauthenticated requests', async () => {
    expect((await request(app).get('/api/goals')).status).toBe(401);
    expect((await request(app).get('/api/dashboard')).status).toBe(401);
  });
  it('invalid tz -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/dashboard?tz=Nope/Zone').set(as('a'));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('invalid date -> 400', async () => {
    const res = await request(app).get('/api/dashboard?date=2024-02-31').set(as('a'));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/dashboard', () => {
  it('returns zero totals with all five keys for a new user', async () => {
    const res = await request(app).get('/api/dashboard?date=2024-05-10&tz=UTC').set(as('a'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      date: '2024-05-10',
      totals: { SOCIAL_MEDIA: 0, CODING: 0, STUDY: 0, EXERCISE: 0, OTHER: 0 },
      goals: [],
      streak: { current: 0, longest: 0 },
    });
  });

  it('buckets by the requested timezone', async () => {
    // 20:00Z on May 9 is already May 10 01:30 in Kolkata.
    await addLog('a', 'CODING', 40, '2024-05-09T20:00:00Z');
    const utc = await request(app).get('/api/dashboard?date=2024-05-10&tz=UTC').set(as('a'));
    const ist = await request(app).get('/api/dashboard?date=2024-05-10&tz=Asia/Kolkata').set(as('a'));
    expect(utc.body.totals.CODING).toBe(0);
    expect(ist.body.totals.CODING).toBe(40);
  });

  it('computes goal progress and met for TARGET and LIMIT', async () => {
    await request(app).post('/api/goals').set(as('a')).send({ activity: 'CODING', type: 'TARGET', minutes: 60 });
    await request(app).post('/api/goals').set(as('a')).send({ activity: 'SOCIAL_MEDIA', type: 'LIMIT', minutes: 30 });
    await addLog('a', 'CODING', 45, '2024-05-10T08:00:00Z');
    await addLog('a', 'SOCIAL_MEDIA', 30, '2024-05-10T09:00:00Z');
    const res = await request(app).get('/api/dashboard?date=2024-05-10&tz=UTC').set(as('a'));
    const byAct = Object.fromEntries(res.body.goals.map((g: { activity: string }) => [g.activity, g]));
    expect(byAct.CODING).toMatchObject({ type: 'TARGET', minutes: 60, progressMinutes: 45, met: false });
    expect(byAct.SOCIAL_MEDIA).toMatchObject({ type: 'LIMIT', progressMinutes: 30, met: true });
    expect(byAct.CODING.goalId).toBeTruthy();
  });

  it('computes a streak; unfinished today does not break it', async () => {
    await addLog('a', 'CODING', 10, '2024-05-08T10:00:00Z');
    await addLog('a', 'CODING', 10, '2024-05-09T10:00:00Z');
    const res = await request(app).get('/api/dashboard?date=2024-05-10&tz=UTC').set(as('a'));
    expect(res.body.streak).toEqual({ current: 2, longest: 2 });
  });

  it('does not leak another user data', async () => {
    await addLog('b', 'CODING', 99, '2024-05-10T10:00:00Z');
    const res = await request(app).get('/api/dashboard?date=2024-05-10&tz=UTC').set(as('a'));
    expect(res.body.totals.CODING).toBe(0);
  });
});

describe('goals', () => {
  it('creates, lists, deletes', async () => {
    const created = await request(app).post('/api/goals').set(as('a')).send({ activity: 'STUDY', type: 'TARGET', minutes: 90 });
    expect(created.status).toBe(201);
    expect(created.body.goal).toMatchObject({ activity: 'STUDY', type: 'TARGET', minutes: 90 });
    const list = await request(app).get('/api/goals').set(as('a'));
    expect(list.body.goals).toHaveLength(1);
    const del = await request(app).delete(`/api/goals/${created.body.goal.id}`).set(as('a'));
    expect(del.status).toBe(204);
    expect((await request(app).get('/api/goals').set(as('a'))).body.goals).toHaveLength(0);
  });
  it('duplicate (activity, type) -> 409, but other type is fine', async () => {
    const body = { activity: 'STUDY', type: 'TARGET', minutes: 90 };
    await request(app).post('/api/goals').set(as('a')).send(body);
    expect((await request(app).post('/api/goals').set(as('a')).send(body)).status).toBe(409);
    expect((await request(app).post('/api/goals').set(as('a')).send({ ...body, type: 'LIMIT' })).status).toBe(201);
  });
  it('validates input', async () => {
    const bads = [
      { activity: 'X', type: 'TARGET', minutes: 5 },
      { activity: 'STUDY', type: 'NOPE', minutes: 5 },
      { activity: 'STUDY', type: 'TARGET', minutes: 0 },
      { activity: 'STUDY', type: 'TARGET', minutes: 1441 },
    ];
    for (const bad of bads) {
      expect((await request(app).post('/api/goals').set(as('a')).send(bad)).status).toBe(400);
    }
  });
  it('another user goal is 404 on delete and stays intact', async () => {
    const g = await request(app).post('/api/goals').set(as('a')).send({ activity: 'STUDY', type: 'TARGET', minutes: 90 });
    expect((await request(app).delete(`/api/goals/${g.body.goal.id}`).set(as('b'))).status).toBe(404);
    expect((await request(app).get('/api/goals').set(as('a'))).body.goals).toHaveLength(1);
    expect((await request(app).get('/api/goals').set(as('b'))).body.goals).toHaveLength(0);
  });
});

describe('sessions', () => {
  it('start -> active -> stop creates a log from server timestamps', async () => {
    const start = await request(app).post('/api/sessions/start').set(as('a')).send({ activity: 'STUDY' });
    expect(start.status).toBe(201);
    expect(start.body.session).toMatchObject({ activity: 'STUDY', startedAt: '2024-05-10T12:00:00.000Z' });

    const active = await request(app).get('/api/sessions/active').set(as('a'));
    expect(active.body.session.id).toBe(start.body.session.id);

    nowMs += 25 * 60_000 + 20_000; // 25m20s later -> rounds to 25
    const stop = await request(app).post('/api/sessions/stop').set(as('a'));
    expect(stop.status).toBe(200);
    expect(stop.body.session).toMatchObject({ minutes: 25, endedAt: '2024-05-10T12:25:20.000Z' });
    expect(stop.body.log).toMatchObject({ activity: 'STUDY', minutes: 25 });
    expect((await request(app).get('/api/sessions/active').set(as('a'))).body.session).toBeNull();
    expect((await request(app).get('/api/dashboard?date=2024-05-10').set(as('a'))).body.totals.STUDY).toBe(25);
  });
  it('second start -> 409; stop without active -> 404', async () => {
    expect((await request(app).post('/api/sessions/stop').set(as('a'))).status).toBe(404);
    await request(app).post('/api/sessions/start').set(as('a')).send({ activity: 'CODING' });
    expect((await request(app).post('/api/sessions/start').set(as('a')).send({ activity: 'CODING' })).status).toBe(409);
  });
  it('minimum 1 minute and cap at 1440', async () => {
    await request(app).post('/api/sessions/start').set(as('a')).send({ activity: 'CODING' });
    nowMs += 5_000;
    expect((await request(app).post('/api/sessions/stop').set(as('a'))).body.session.minutes).toBe(1);
    await request(app).post('/api/sessions/start').set(as('a')).send({ activity: 'CODING' });
    nowMs += 3 * 24 * 3600_000;
    expect((await request(app).post('/api/sessions/stop').set(as('a'))).body.session.minutes).toBe(1440);
  });
  it('sessions are per user', async () => {
    await request(app).post('/api/sessions/start').set(as('a')).send({ activity: 'CODING' });
    expect((await request(app).get('/api/sessions/active').set(as('b'))).body.session).toBeNull();
    expect((await request(app).post('/api/sessions/start').set(as('b')).send({ activity: 'CODING' })).status).toBe(201);
  });
  it('rejects bad activity', async () => {
    expect((await request(app).post('/api/sessions/start').set(as('a')).send({ activity: 'NAP' })).status).toBe(400);
  });
});

describe('GET /api/analytics/summary', () => {
  it('zero-fills the whole range', async () => {
    const res = await request(app).get('/api/analytics/summary?range=week&tz=UTC').set(as('a'));
    expect(res.status).toBe(200);
    expect(res.body.range).toBe('week');
    expect(res.body.days).toHaveLength(7);
    expect(res.body.days[0].date).toBe('2024-05-04');
    expect(res.body.days[6].date).toBe('2024-05-10');
    expect(res.body.days[3].totalsByActivity).toEqual({ SOCIAL_MEDIA: 0, CODING: 0, STUDY: 0, EXERCISE: 0, OTHER: 0 });
  });
  it('aggregates per day and month has 30 days', async () => {
    await addLog('a', 'CODING', 30, '2024-05-10T01:00:00Z');
    await addLog('a', 'CODING', 15, '2024-05-10T11:00:00Z');
    await addLog('a', 'STUDY', 20, '2024-05-09T10:00:00Z');
    await addLog('a', 'CODING', 500, '2024-03-01T10:00:00Z'); // outside range
    await addLog('b', 'CODING', 500, '2024-05-10T10:00:00Z'); // other user
    const res = await request(app).get('/api/analytics/summary?range=month&tz=UTC').set(as('a'));
    expect(res.body.days).toHaveLength(30);
    const last = res.body.days[29];
    expect(last.date).toBe('2024-05-10');
    expect(last.totalsByActivity.CODING).toBe(45);
    expect(res.body.days[28].totalsByActivity.STUDY).toBe(20);
  });
  it('respects timezone and validates query', async () => {
    await addLog('a', 'CODING', 30, '2024-05-10T20:00:00Z'); // May 11 01:30 IST
    nowMs = Date.parse('2024-05-11T05:00:00Z'); // May 11 10:30 IST
    const res = await request(app).get('/api/analytics/summary?range=week&tz=Asia/Kolkata').set(as('a'));
    expect(res.body.days[6]).toMatchObject({ date: '2024-05-11' });
    expect(res.body.days[6].totalsByActivity.CODING).toBe(30);
    expect((await request(app).get('/api/analytics/summary?range=year').set(as('a'))).status).toBe(400);
    expect((await request(app).get('/api/analytics/summary?range=week&tz=Bad').set(as('a'))).status).toBe(400);
  });
});
