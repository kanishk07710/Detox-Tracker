/**
 * Rate limit test lives in its own file (own module registry) so the counter is not
 * shared with other suites. The limiter is skipped in NODE_ENV=test unless enabled.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';

describe('auth rate limiting', () => {
  it('returns 429 RATE_LIMITED after too many attempts', async () => {
    process.env.AUTH_RATE_LIMIT_ENABLED = '1';
    const { default: app } = await import('../../src/app');
    let last = 0;
    let body: { error?: { code?: string } } = {};
    for (let i = 0; i < 12; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'x@example.com', password: 'whatever-123' });
      last = res.status;
      body = res.body;
    }
    expect(last).toBe(429);
    expect(body.error?.code).toBe('RATE_LIMITED');
    delete process.env.AUTH_RATE_LIMIT_ENABLED;
  });
});
