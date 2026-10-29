/**
 * Test helper: a supertest agent that is already logged in.
 * An agent keeps a cookie jar, so the dt_session cookie set by /register is sent
 * on later requests, exactly like a browser would.
 */
import request from 'supertest';
import app from '../../src/app';

let counter = 0;

export async function createAuthedAgent(email = `user${++counter}-${Date.now()}@example.com`) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ email, password: 'correct-horse-9' });
  if (res.status !== 201) throw new Error(`test setup: register failed ${res.status}`);
  return { agent, user: res.body.user as { id: string; email: string } };
}
