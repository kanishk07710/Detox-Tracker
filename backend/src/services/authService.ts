/**
 * services/authService.ts — register / login / token logic. No Express here.
 *
 * Decision (see docs/decisions/001-auth.md): stateless signed JWT in an HttpOnly
 * cookie, passwords hashed with bcryptjs.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/AppError';
import { SESSION_TTL_SECONDS } from '../lib/sessionCookie';
import { DuplicateEmailError, type UserRepository } from '../repositories/userRepository';
import type { LoginInput, RegisterInput } from '../schemas/auth';

export interface PublicUser {
  id: string;
  email: string;
}

// Cost factor 12 ~ a few hundred ms: slow enough to hurt brute force, fine for login.
// Tests use the minimum (4) purely so the suite stays fast; never lowered elsewhere.
const BCRYPT_COST = env.NODE_ENV === 'test' ? 4 : 12;

// Pre-computed hash compared against when the email is unknown, so "no such user"
// takes as long as "wrong password" (prevents user enumeration via response time).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_COST);

const INVALID_CREDENTIALS = () =>
  new AppError('UNAUTHENTICATED', 'Invalid email or password');

export async function register(repo: UserRepository, input: RegisterInput): Promise<PublicUser> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  try {
    const user = await repo.create({ email: input.email, passwordHash });
    return { id: user.id, email: user.email };
  } catch (err) {
    // The DB unique constraint is the real guard (a pre-check would race).
    if (err instanceof DuplicateEmailError) {
      throw new AppError('CONFLICT', 'An account with this email already exists');
    }
    throw err;
  }
}

export async function login(repo: UserRepository, input: LoginInput): Promise<PublicUser> {
  const user = await repo.findByEmail(input.email);
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw INVALID_CREDENTIALS();
  return { id: user.id, email: user.email };
}

export function signSessionToken(user: PublicUser): string {
  // Pin the algorithm on both sign and verify to block "alg: none" style attacks.
  return jwt.sign({ email: user.email }, env.SESSION_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: SESSION_TTL_SECONDS,
  });
}

export function verifySessionToken(token: string): PublicUser | null {
  try {
    const payload = jwt.verify(token, env.SESSION_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !payload.sub || typeof payload.email !== 'string') {
      return null;
    }
    return { id: payload.sub, email: payload.email };
  } catch {
    return null; // expired, tampered, malformed: all just "not logged in"
  }
}
