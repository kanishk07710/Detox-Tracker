/**
 * Auth integration tests. `request.agent` keeps a cookie jar like a browser.
 */
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app';
import { memoryLogRepository } from '../../src/repositories/logRepository';
import { memoryUserRepository } from '../../src/repositories/userRepository';
import { createAuthedAgent } from '../helpers/auth';

const creds = { email: 'kanishk@example.com', password: 'correct-horse-9' };

beforeEach(() => {
  memoryUserRepository.clear();
  memoryLogRepository.clear();
});

describe('POST /api/auth/register', () => {
  it('creates a user, returns 201 and sets an HttpOnly session cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: expect.any(String), email: creds.email });
    expect(JSON.stringify(res.body)).not.toContain('password');
    const cookie = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(cookie).toContain('dt_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax'); // test env is not production
  });

  it('normalises email case', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...creds, email: 'Kanishk@Example.COM' });
    expect(res.body.user.email).toBe(creds.email);
  });

  it('returns 409 for a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it.each([
    ['short password', { ...creds, password: 'short' }],
    ['bad email', { ...creds, email: 'nope' }],
    ['missing password', { email: creds.email }],
    ['empty body', {}],
  ])('rejects %s with 400', async (_n, body) => {
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('login / me / logout', () => {
  it('full flow: login, me, logout, me again is 401', async () => {
    await request(app).post('/api/auth/register').send(creds);

    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send(creds);
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe(creds.email);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(creds.email);

    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);

    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
  });

  it('wrong password and unknown email give the SAME generic 401', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ ...creds, password: 'wrong-password' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'whatever-123' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error.message).toBe('Invalid email or password');
  });

  it('login validates input', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x' });
    expect(res.status).toBe(400);
  });

  it('GET /me without cookie is 401; tampered cookie is 401', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const res = await request(app).get('/api/auth/me').set('Cookie', 'dt_session=not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('protection and isolation', () => {
  it('/api/logs requires authentication', async () => {
    for (const res of [
      await request(app).get('/api/logs'),
      await request(app).post('/api/logs').send({ activity: 'CODING', minutes: 5 }),
      await request(app).delete('/api/logs/abc'),
    ]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('/health stays unauthenticated', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
  });

  it('user A cannot see or delete user B logs (404, not 403)', async () => {
    const a = await createAuthedAgent('a@example.com');
    const b = await createAuthedAgent('b@example.com');

    const created = await b.agent.post('/api/logs').send({ activity: 'CODING', minutes: 30 });
    expect(created.status).toBe(201);

    // A's list does not include B's log.
    const listA = await a.agent.get('/api/logs');
    expect(listA.body.logs).toEqual([]);

    // A deleting B's log looks exactly like a missing id.
    const del = await a.agent.delete(`/api/logs/${created.body.id}`);
    expect(del.status).toBe(404);

    // B's log is untouched.
    const listB = await b.agent.get('/api/logs');
    expect(listB.body.logs).toHaveLength(1);
    expect(listB.body.logs[0].userId).toBe(b.user.id);
  });
});
