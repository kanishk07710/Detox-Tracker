'use client';

import { useEffect, useState } from 'react';
import Protected from '@/components/Protected';
import { dashboardApi, errorMessage } from '@/lib/api';
import { ACTIVITY_LABEL, formatMinutes, localDate } from '@/lib/format';
import { ACTIVITIES, type Dashboard } from '@/types';

function DashboardContent() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The browser's local date + timezone tell the server what "today" means.
    dashboardApi.get(localDate()).then(setData).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <p className="msg-error" role="alert">{error}</p>;
  if (!data) return <p className="muted">Loading...</p>;

  return (
    <>
      <p className="muted">{data.date}</p>

      <h2>Streak</h2>
      <p>Current: <strong>{data.streak.current}</strong> days. Longest: <strong>{data.streak.longest}</strong> days.</p>

      <h2>Today</h2>
      <table className="plain">
        <thead><tr><th>Activity</th><th className="num">Time</th></tr></thead>
        <tbody>
          {ACTIVITIES.map((a) => (
            <tr key={a}><td>{ACTIVITY_LABEL[a]}</td><td className="num">{formatMinutes(data.totals[a] ?? 0)}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>Goals</h2>
      {data.goals.length === 0 && <p className="muted">No goals set. Add one on the Goals page.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {data.goals.map((g) => {
          const pct = Math.min(100, Math.round((g.progressMinutes / g.minutes) * 100));
          const over = g.type === 'LIMIT' && g.progressMinutes > g.minutes;
          return (
            <li key={g.goalId} style={{ marginBottom: '1rem' }}>
              <div>
                {ACTIVITY_LABEL[g.activity]}: {g.type === 'TARGET' ? 'at least' : 'at most'} {formatMinutes(g.minutes)}
                {' '}({formatMinutes(g.progressMinutes)} so far) - {g.met ? 'on track' : g.type === 'LIMIT' ? 'over limit' : 'not yet'}
              </div>
              <div className={`bar${over ? ' over' : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function DashboardPage() {
  return <Protected title="Dashboard"><DashboardContent /></Protected>;
}
