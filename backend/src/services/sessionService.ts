/**
 * services/sessionService.ts — server-authoritative focus timer.
 *
 * The client NEVER sends timestamps. Start and stop times come from the
 * server clock (`now`), so the duration cannot be forged and a closed
 * browser tab does not lose the session.
 */
import { AppError, notFound } from '../lib/AppError';
import {
  ActiveSessionExistsError,
  type FocusSession,
  type SessionRepository,
} from '../repositories/sessionRepository';
import type { LogRepository } from '../repositories/logRepository';
import type { Activity, Log } from '../schemas/log';

const MS_PER_MINUTE = 60_000;
const MAX_MINUTES = 1440; // same cap as manual logs

/** max(1, round(elapsed minutes)), capped at 1440. Exported for unit tests. */
export function sessionMinutes(startedAt: Date, endedAt: Date): number {
  const elapsed = (endedAt.getTime() - startedAt.getTime()) / MS_PER_MINUTE;
  return Math.min(MAX_MINUTES, Math.max(1, Math.round(elapsed)));
}

export function createSessionService(
  sessions: SessionRepository,
  logs: LogRepository,
  now: () => Date = () => new Date()
) {
  return {
    async start(userId: string, activity: Activity): Promise<FocusSession> {
      try {
        return await sessions.start(userId, activity, now());
      } catch (e) {
        if (e instanceof ActiveSessionExistsError) {
          throw new AppError('CONFLICT', 'A focus session is already running.');
        }
        throw e;
      }
    },

    getActive: (userId: string) => sessions.findActive(userId),

    async stop(userId: string): Promise<{ session: FocusSession; minutes: number; log: Log }> {
      const endedAt = now();
      const session = await sessions.stop(userId, endedAt);
      if (!session) throw notFound('No active session.');
      const minutes = sessionMinutes(session.startedAt, endedAt);
      // Trade-off: if this insert failed the session would already be closed. Acceptable
      // for now; a DB transaction would fix it once both writes share one store.
      const log = await logs.create(userId, {
        activity: session.activity,
        minutes,
        note: null,
        loggedAt: endedAt,
      });
      return { session, minutes, log };
    },
  };
}

export const serializeActive = (s: FocusSession) => ({
  id: s.id,
  activity: s.activity,
  startedAt: s.startedAt.toISOString(),
});
