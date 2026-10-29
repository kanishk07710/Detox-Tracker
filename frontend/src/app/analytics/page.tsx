'use client';

import { useEffect, useState } from 'react';
import Protected from '@/components/Protected';
import { analyticsApi, errorMessage } from '@/lib/api';
import { ACTIVITY_LABEL, formatMinutes } from '@/lib/format';
import { ACTIVITIES, type Analytics } from '@/types';

function AnalyticsContent() {
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    analyticsApi.summary(range).then(setData).catch((e) => setError(errorMessage(e)));
  }, [range]);

  const dayTotal = (t: Partial<Record<string, number>>) =>
    Object.values(t).reduce<number>((s, v) => s + (v ?? 0), 0);
  const max = data ? Math.max(1, ...data.days.map((d) => dayTotal(d.totalsByActivity))) : 1;

  return (
    <>
      <div className="field" style={{ maxWidth: '12rem' }}>
        <label htmlFor="range">Range</label>
        <select id="range" value={range} onChange={(e) => setRange(e.target.value as 'week' | 'month')}>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
        </select>
      </div>
      {error && <p className="msg-error" role="alert">{error}</p>}
      {!data && !error && <p className="muted">Loading...</p>}
      {data && data.days.length === 0 && <p className="muted">No data for this range.</p>}
      {data && data.days.length > 0 && (
        <>
          {/* One stacked column per day; segment colour = activity. Flexbox, no chart library. */}
          <div className="panel" style={{ paddingBottom: '0.9rem' }}>
          <div role="img" aria-label="Minutes per day, stacked by activity"
               style={{ display: 'flex', alignItems: 'flex-end', gap: data.days.length > 10 ? 3 : 10, height: 180,
                        borderBottom: '1px solid var(--rule)' }}>
            {data.days.map((d) => {
              const t = dayTotal(d.totalsByActivity);
              return (
                <div key={d.date} title={`${d.date}: ${formatMinutes(t)}`}
                     style={{ flex: 1, height: `${(t / max) * 100}%`, display: 'flex', flexDirection: 'column-reverse',
                              gap: 1, minHeight: t > 0 ? 2 : 0 }}>
                  {ACTIVITIES.map((a) => {
                    const m = d.totalsByActivity[a] ?? 0;
                    return m > 0 ? <span key={a} className={`c-${a}`} style={{ flex: m }} /> : null;
                  })}
                </div>
              );
            })}
          </div>
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
            <span>{data.days[0].date}</span>
            <span>Tallest day {formatMinutes(max)}</span>
            <span>{data.days[data.days.length - 1].date}</span>
          </div>
          </div>
          <ul className="key" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 1.5rem', border: 0 }}>
            {ACTIVITIES.map((a) => (
              <li key={a} style={{ border: 0, padding: 0 }}>
                <span className={`dot c-${a}`} />{ACTIVITY_LABEL[a]}
              </li>
            ))}
          </ul>
          <div className="scroll-x">
          <table className="plain" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Date</th>
                {ACTIVITIES.map((a) => <th key={a} className="num">{ACTIVITY_LABEL[a]}</th>)}
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.days.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  {ACTIVITIES.map((a) => <td key={a} className="num">{formatMinutes(d.totalsByActivity[a] ?? 0)}</td>)}
                  <td className="num">{formatMinutes(dayTotal(d.totalsByActivity))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </>
  );
}

export default function AnalyticsPage() {
  return <Protected title="Analytics"><AnalyticsContent /></Protected>;
}
