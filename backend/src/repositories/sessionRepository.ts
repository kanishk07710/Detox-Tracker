/**
 * sessionRepository.ts — storage seam for focus-timer sessions.
 * Timestamps are always supplied by the SERVER (the client never sends times),
 * so a user cannot fake a 10-hour session by editing a request.
 */
import { randomUUID } from 'node:crypto';
import type { Activity } from '../schemas/log';

export interface FocusSession {
  id: string;
  userId: string;
  activity: Activity;
  startedAt: Date;
  endedAt: Date | null; // null while running
}

/** Thrown when the user already has a running session. Services map it to 409. */
export class ActiveSessionExistsError extends Error {
  constructor() {
    super('A session is already active');
  }
}

export interface SessionRepository {
  findActive(userId: string): Promise<FocusSession | null>;
  /** @throws ActiveSessionExistsError */
  start(userId: string, activity: Activity, startedAt: Date): Promise<FocusSession>;
  /** Ends the user's active session; null if there is none. */
  stop(userId: string, endedAt: Date): Promise<FocusSession | null>;
}

export function createMemorySessionRepository(): SessionRepository & { clear(): void } {
  let sessions: FocusSession[] = [];
  return {
    async findActive(userId) {
      return sessions.find((s) => s.userId === userId && s.endedAt === null) ?? null;
    },
    async start(userId, activity, startedAt) {
      if (sessions.some((s) => s.userId === userId && s.endedAt === null)) {
        throw new ActiveSessionExistsError();
      }
      const s: FocusSession = { id: randomUUID(), userId, activity, startedAt, endedAt: null };
      sessions.push(s);
      return s;
    },
    async stop(userId, endedAt) {
      const s = sessions.find((x) => x.userId === userId && x.endedAt === null);
      if (!s) return null;
      s.endedAt = endedAt;
      return s;
    },
    clear() {
      sessions = [];
    },
  };
}
