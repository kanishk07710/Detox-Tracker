/**
 * lib/guest.ts — guest mode. Everything lives in this browser's localStorage
 * and no request is ever made to the backend. api.ts routes here whenever the
 * guest flag is set, returning the same shapes the server would.
 */
import { localDate } from '@/lib/format';
import type {
  Activity, ActivityLog, Analytics, CreateLogInput, Dashboard, FocusSession, Goal, GoalProgress,
  GoalType, Totals, User,
} from '@/types';

const FLAG = 'detox.guest';
const DATA = 'detox.guest.data';

interface Store {
  logs: ActivityLog[];
  goals: Goal[];
  session: FocusSession | null;
}

export const GUEST_USER: User = { id: 'guest', email: 'Guest' };

export function isGuest(): boolean {
  try { return typeof window !== 'undefined' && localStorage.getItem(FLAG) === '1'; } catch { return false; }
}

export function enterGuest() {
  try { localStorage.setItem(FLAG, '1'); } catch { /* storage blocked: guest mode cannot persist */ }
}

export function leaveGuest() {
  try { localStorage.removeItem(FLAG); localStorage.removeItem(DATA); } catch { /* nothing to clear */ }
}

function read(): Store {
  try {
    const raw = localStorage.getItem(DATA);
    if (raw) return JSON.parse(raw) as Store;
  } catch { /* fall through to a fresh store */ }
  return { logs: [], goals: [], session: null };
}

function write(s: Store) {
  try { localStorage.setItem(DATA, JSON.stringify(s)); } catch { /* quota or blocked: keep going in memory */ }
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const sumByActivity = (logs: ActivityLog[]) => {
  const t: Partial<Totals> = {};
  for (const l of logs) t[l.activity] = (t[l.activity] ?? 0) + l.minutes;
  return t;
};

const dayLogs = (logs: ActivityLog[], date: string) => logs.filter((l) => localDate(new Date(l.loggedAt)) === date);

const shift = (date: string, days: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + days));
};

/** A day counts toward the streak if something was logged and no limit was broken. */
function dayClean(s: Store, date: string): boolean {
  const logs = dayLogs(s.logs, date);
  if (!logs.length) return false;
  const t = sumByActivity(logs);
  return s.goals.every((g) => g.type !== 'LIMIT' || (t[g.activity] ?? 0) <= g.minutes);
}

export const guestApi = {
  logs: {
    list: (): { logs: ActivityLog[] } => ({
      logs: [...read().logs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)),
    }),
    create(input: CreateLogInput): ActivityLog {
      const s = read();
      const now = new Date().toISOString();
      const log: ActivityLog = {
        id: uid(), userId: GUEST_USER.id, activity: input.activity, minutes: input.minutes,
        note: input.note ?? null, loggedAt: input.loggedAt ?? now, createdAt: now,
      };
      s.logs.push(log);
      write(s);
      return log;
    },
    remove(id: string) {
      const s = read();
      s.logs = s.logs.filter((l) => l.id !== id);
      write(s);
    },
  },

  goals: {
    list: (): Goal[] => read().goals,
    create(input: { activity: Activity; type: GoalType; minutes: number }) {
      const s = read();
      s.goals.push({ id: uid(), ...input });
      write(s);
    },
    remove(id: string) {
      const s = read();
      s.goals = s.goals.filter((g) => g.id !== id);
      write(s);
    },
  },

  session: {
    active: (): { session: FocusSession | null } => ({ session: read().session }),
    start(activity: Activity): { session: FocusSession } {
      const s = read();
      s.session = { id: uid(), activity, startedAt: new Date().toISOString() };
      write(s);
      return { session: s.session };
    },
    stop(): { session: FocusSession; log: ActivityLog } {
      const s = read();
      const session = s.session!;
      const minutes = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000));
      s.session = null;
      write(s);
      const log = guestApi.logs.create({ activity: session.activity, minutes });
      return { session: { ...session, endedAt: log.loggedAt, minutes }, log };
    },
  },

  dashboard(date: string): Dashboard {
    const s = read();
    const totals = sumByActivity(dayLogs(s.logs, date));
    const goals: GoalProgress[] = s.goals.map((g) => {
      const progress = totals[g.activity] ?? 0;
      return {
        goalId: g.id, activity: g.activity, type: g.type, minutes: g.minutes, progressMinutes: progress,
        met: g.type === 'TARGET' ? progress >= g.minutes : progress <= g.minutes,
      };
    });

    // Today is still in progress, so an empty today does not break the streak.
    let current = 0;
    let d = dayClean(s, date) ? date : shift(date, -1);
    while (dayClean(s, d)) { current += 1; d = shift(d, -1); }

    const days = [...new Set(s.logs.map((l) => localDate(new Date(l.loggedAt))))].sort();
    let longest = 0;
    let run = 0;
    let prev = '';
    for (const day of days) {
      run = dayClean(s, day) ? (prev && shift(prev, 1) === day ? run + 1 : 1) : 0;
      prev = day;
      longest = Math.max(longest, run);
    }
    return { date, totals, goals, streak: { current, longest: Math.max(longest, current) } };
  },

  analytics(range: 'week' | 'month'): Analytics {
    const s = read();
    const n = range === 'week' ? 7 : 30;
    const today = localDate();
    const days = Array.from({ length: n }, (_, i) => {
      const date = shift(today, i - (n - 1));
      return { date, totalsByActivity: sumByActivity(dayLogs(s.logs, date)) };
    });
    return { range, days };
  },
};
