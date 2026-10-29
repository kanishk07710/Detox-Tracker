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
          {/* Plain SVG: one bar per day = total minutes, one colour. */}
          <svg role="img" aria-label="Total minutes per day" width="100%" height="120"
               viewBox={`0 0 ${data.days.length * 10} 100`} preserveAspectRatio="none">
            {data.days.map((d, i) => {
              const h = (dayTotal(d.totalsByActivity) / max) * 100;
              return <rect key={d.date} x={i * 10 + 1} y={100 - h} width={8} height={h} fill="var(--accent)" />;
            })}
          </svg>
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
        </>
      )}
    </>
  );
}

export default function AnalyticsPage() {
  return <Protected title="Analytics"><AnalyticsContent /></Protected>;
}
