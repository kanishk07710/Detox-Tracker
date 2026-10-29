'use client';

import { useEffect, useState } from 'react';
import DayRibbon from '@/components/DayRibbon';
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

  const total = ACTIVITIES.reduce((s, a) => s + (data.totals[a] ?? 0), 0);
  const social = data.totals.SOCIAL_MEDIA ?? 0;
  const { current, longest } = data.streak;

  return (
    <>
      <p className="muted">{data.date}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem 3.5rem', margin: '0.5rem 0 2rem' }}>
        <div>
          <div className="figure">{formatMinutes(total)}</div>
          <div className="muted">logged today</div>
        </div>
        <div>
          <div className="figure" style={{ color: social > 0 ? 'var(--c-social)' : undefined }}>
            {formatMinutes(social)}
          </div>
          <div className="muted">on social media</div>
        </div>
        <div>
          <div className="figure">{current}</div>
          <div className="muted">day streak, best {longest}</div>
        </div>
      </div>

      <DayRibbon totals={data.totals} />

      <ul className="key">
        {ACTIVITIES.map((a) => (
          <li key={a}>
            <span className="name"><span className={`dot c-${a}`} />{ACTIVITY_LABEL[a]}</span>
            <span className="time">{formatMinutes(data.totals[a] ?? 0)}</span>
          </li>
        ))}
      </ul>

      <h2>Goals</h2>
      {data.goals.length === 0 && (
        <p className="muted">No goals yet. Set a daily limit for social media on the Goals page.</p>
      )}
      {data.goals.map((g) => {
        const pct = Math.min(100, Math.round((g.progressMinutes / g.minutes) * 100));
        const over = g.type === 'LIMIT' && g.progressMinutes > g.minutes;
        const status = over
          ? `Over by ${formatMinutes(g.progressMinutes - g.minutes)}`
          : g.type === 'LIMIT'
            ? `${formatMinutes(g.minutes - g.progressMinutes)} left`
            : g.met ? 'Reached' : `${formatMinutes(g.minutes - g.progressMinutes)} to go`;
        return (
          <div key={g.goalId} className="goal">
            <div className="row">
              <span>
                <span className={`dot c-${g.activity}`} />
                {ACTIVITY_LABEL[g.activity]}, {g.type === 'TARGET' ? 'at least' : 'at most'} {formatMinutes(g.minutes)}
              </span>
              <span className={`status${over ? ' over' : ''}`}>{status}</span>
            </div>
            <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                 aria-label={`${ACTIVITY_LABEL[g.activity]} goal progress`}>
              <div className={`c-${g.activity}`} style={{ width: `${pct}%`, background: over ? 'var(--danger)' : undefined }} />
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function DashboardPage() {
  return <Protected title="Today"><DashboardContent /></Protected>;
}
