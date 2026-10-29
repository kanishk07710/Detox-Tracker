/**
 * lib/api.ts — the single place that talks to the backend.
 *
 * WHY: one file to change if a URL or response shape changes, and every
 * request gets the same error handling.
 */
import type {
  Activity, ActivityLog, Analytics, CreateLogInput, Dashboard, FocusSession, Goal, GoalType, User,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * An HTTP error from the backend ({ error: { code, message, details } }).
 * A network failure (server down, CORS, offline) is NOT this: fetch throws a
 * TypeError instead, so the UI can say "cannot reach server" vs "server said no".
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level messages from the backend, if details is an array or { field: msg }. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    const d = this.details;
    if (Array.isArray(d)) {
      for (const item of d) {
        const f = item as { field?: string; path?: string | string[]; message?: string };
        const key = Array.isArray(f.path) ? f.path[0] : f.path ?? f.field;
        if (key && f.message) out[String(key)] = f.message;
      }
    } else if (d && typeof d === 'object') {
      for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
        out[k] = Array.isArray(v) ? String(v[0]) : String(v);
      }
    }
    return out;
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return 'Cannot reach the server. Check your connection and try again.';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // fetch() rejects only on network failure; we let that propagate as-is.
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include', // send the session cookie
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? `Request failed (${res.status})`,
      body?.error?.details
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const json = (data: unknown) => JSON.stringify(data);
const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const authApi = {
  register: (email: string, password: string) =>
    request<{ user: User }>('/api/auth/register', { method: 'POST', body: json({ email, password }) }),
  login: (email: string, password: string) =>
    request<{ user: User }>('/api/auth/login', { method: 'POST', body: json({ email, password }) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/api/auth/me'),
};

export const logsApi = {
  list: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    return request<{ logs: ActivityLog[] }>(`/api/logs${qs ? `?${qs}` : ''}`);
  },
  create: (input: CreateLogInput) =>
    request<ActivityLog>('/api/logs', { method: 'POST', body: json(input) }),
  remove: (id: string) => request<void>(`/api/logs/${id}`, { method: 'DELETE' }),
};

// ---- Phase 8: shapes are assumptions; adjust here if the backend differs ----

export const dashboardApi = {
  get: (date: string) =>
    request<Dashboard>(`/api/dashboard?date=${date}&tz=${encodeURIComponent(tz())}`),
};

export const goalsApi = {
  list: async () => {
    const r = await request<{ goals: Goal[] }>('/api/goals');
    return r.goals;
  },
  create: (input: { activity: Activity; type: GoalType; minutes: number }) =>
    request<unknown>('/api/goals', { method: 'POST', body: json(input) }),
  remove: (id: string) => request<void>(`/api/goals/${id}`, { method: 'DELETE' }),
};

export const sessionsApi = {
  active: () => request<{ session: FocusSession | null }>('/api/sessions/active'),
  start: (activity: Activity) =>
    request<{ session: FocusSession }>('/api/sessions/start', { method: 'POST', body: json({ activity }) }),
  stop: () =>
    request<{ session: FocusSession; log: ActivityLog }>('/api/sessions/stop', { method: 'POST' }),
};

export const analyticsApi = {
  summary: (range: 'week' | 'month') =>
    request<Analytics>(`/api/analytics/summary?range=${range}&tz=${encodeURIComponent(tz())}`),
};
