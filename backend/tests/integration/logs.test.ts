/**
 * Integration tests: real Express app, in-process HTTP via Supertest (no port bound).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createAuthedAgent } from '../helpers/auth';
import { memoryLogRepository } from '../../src/repositories/logRepository';

// Fresh store per test so tests cannot affect each other.
// All /api/logs routes need a session, so each test gets a freshly registered user.
// api() returns a supertest agent holding that user's cookie.
let agent: Awaited<ReturnType<typeof createAuthedAgent>>['agent'];
const api = () => agent;
beforeEach(async () => {
  memoryLogRepository.clear();
  ({ agent } = await createAuthedAgent());
});

const valid = { activity: 'CODING', minutes: 30 };

describe('foundation', () => {
  it('GET /health returns ok', async () => {
    const res = await api().get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('unknown route returns the standard 404 error shape', async () => {
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('malformed JSON returns VALIDATION_ERROR', async () => {
    const res = await api()
      .post('/api/logs')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/logs validation', () => {
  const bad: [string, unknown][] = [
    ['bad enum', { activity: 'NAPPING', minutes: 10 }],
    ['minutes 0', { activity: 'CODING', minutes: 0 }],
    ['minutes 1441', { activity: 'CODING', minutes: 1441 }],
    ['non-integer minutes', { activity: 'CODING', minutes: 1.5 }],
    ['string minutes', { activity: 'CODING', minutes: '10' }],
    ['note too long', { ...valid, note: 'x'.repeat(281) }],
    ['missing activity', { minutes: 10 }],
    ['missing minutes', { activity: 'CODING' }],
    ['bad loggedAt', { ...valid, loggedAt: 'yesterday' }],
    ['empty body', {}],
  ];

  it.each(bad)('rejects %s', async (_name, body) => {
    const res = await api().post('/api/logs').send(body as object);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('accepts boundary values 1, 1440 and a 280-char note', async () => {
    for (const body of [
      { ...valid, minutes: 1 },
      { ...valid, minutes: 1440 },
      { ...valid, note: 'x'.repeat(280) },
    ]) {
      const res = await api().post('/api/logs').send(body);
      expect(res.status).toBe(201);
    }
  });
});

describe('logs happy path', () => {
  it('creates, lists and deletes a log', async () => {
    const created = await api()
      .post('/api/logs')
      .send({ ...valid, note: 'deep work', loggedAt: '2026-01-02T10:00:00.000Z' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      activity: 'CODING',
      minutes: 30,
      note: 'deep work',
      loggedAt: '2026-01-02T10:00:00.000Z',
    });
    expect(typeof created.body.id).toBe('string');
    expect(typeof created.body.userId).toBe('string');
    expect(typeof created.body.createdAt).toBe('string');

    const list = await api().get('/api/logs');
    expect(list.status).toBe(200);
    expect(list.body.logs).toHaveLength(1);

    const del = await api().delete(`/api/logs/${created.body.id}`);
    expect(del.status).toBe(204);

    const after = await api().get('/api/logs');
    expect(after.body.logs).toEqual([]);
  });

  it('defaults note to null and loggedAt to now', async () => {
    const res = await api().post('/api/logs').send(valid);
    expect(res.body.note).toBeNull();
    expect(Math.abs(Date.now() - new Date(res.body.loggedAt).getTime())).toBeLessThan(5000);
  });

  it('deleting an unknown id returns 404', async () => {
    const res = await api().delete('/api/logs/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/logs from/to filtering', () => {
  beforeEach(async () => {
    for (const day of ['01', '02', '03']) {
      await api()
        .post('/api/logs')
        .send({ ...valid, loggedAt: `2026-01-${day}T12:00:00.000Z` });
    }
  });

  it('filters by from', async () => {
    const res = await api().get('/api/logs?from=2026-01-02T00:00:00.000Z');
    expect(res.body.logs).toHaveLength(2);
  });

  it('filters by to', async () => {
    const res = await api().get('/api/logs?to=2026-01-02T23:59:59.000Z');
    expect(res.body.logs).toHaveLength(2);
  });

  it('filters by from and to', async () => {
    const res = await api().get(
      '/api/logs?from=2026-01-02T00:00:00.000Z&to=2026-01-02T23:59:59.000Z'
    );
    expect(res.body.logs).toHaveLength(1);
  });

  it('rejects invalid dates and from after to', async () => {
    expect((await api().get('/api/logs?from=nope')).status).toBe(400);
    const res = await api().get(
      '/api/logs?from=2026-02-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z'
    );
    expect(res.status).toBe(400);
  });
});
