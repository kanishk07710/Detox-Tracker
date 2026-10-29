/**
 * userRepository.ts — the data-access seam for users.
 *
 * WHY an interface: authService depends on this shape, not on Prisma. Tests and
 * early phases use the in-memory version; production swaps in the Prisma one
 * (see repositories/userRepositoryProvider.ts) without touching business logic.
 */
import { randomUUID } from 'node:crypto';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super('Email already registered');
  }
}

export interface UserRepository {
  /** Must throw DuplicateEmailError if the email exists (DB unique constraint is the source of truth). */
  create(data: { email: string; passwordHash: string }): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
}

/** In-memory implementation. Data is wiped on restart; fine for tests/dev only. */
export function createMemoryUserRepository(): UserRepository & { clear(): void } {
  const users = new Map<string, UserRecord>();
  return {
    async create({ email, passwordHash }) {
      for (const u of users.values()) {
        if (u.email === email) throw new DuplicateEmailError();
      }
      const user: UserRecord = { id: randomUUID(), email, passwordHash, createdAt: new Date() };
      users.set(user.id, user);
      return user;
    },
    async findByEmail(email) {
      for (const u of users.values()) if (u.email === email) return u;
      return null;
    },
    async findById(id) {
      return users.get(id) ?? null;
    },
    clear() {
      users.clear();
    },
  };
}

export const memoryUserRepository = createMemoryUserRepository();
