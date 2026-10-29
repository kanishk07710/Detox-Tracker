'use client';

import { useCallback, useEffect, useState } from 'react';
import ActivitySelect from '@/components/ActivitySelect';
import Protected from '@/components/Protected';
import { errorMessage, sessionsApi } from '@/lib/api';
import { ACTIVITY_LABEL, formatMinutes } from '@/lib/format';
import type { Activity, FocusSession } from '@/types';

function pad(n: number) { return String(n).padStart(2, '0'); }
function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function FocusContent() {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activity, setActivity] = useState<Activity>('STUDY');
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSession((await sessionsApi.active()).session);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  // The ticking only re-renders the page. Elapsed time is always
  // (now - startedAt) using the SERVER's start time, so a reload or a second
  // tab shows the same value and nothing drifts or resets.
  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session]);

  async function start() {
    setBusy(true); setError(null); setResult(null);
    try {
      setSession((await sessionsApi.start(activity)).session);
      setNow(Date.now());
    } catch (e) {
      setError(errorMessage(e));
    } finally { setBusy(false); }
  }

  async function stop() {
    setBusy(true); setError(null);
    try {
      const r = await sessionsApi.stop();
      setSession(null);
      setResult(`Logged ${formatMinutes(r.log.minutes)} of ${ACTIVITY_LABEL[r.log.activity].toLowerCase()}.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally { setBusy(false); }
  }

  if (!loaded) return <p className="muted">Loading...</p>;

  return (
    <>
      {error && <p className="msg-error" role="alert">{error}</p>}
      {result && <p className="msg-ok" role="status">{result}</p>}
      {session ? (
        <>
          <p>{ACTIVITY_LABEL[session.activity]} in progress.</p>
          <p className="clock" aria-live="off">
            {clock(now - new Date(session.startedAt).getTime())}
          </p>
          <p className="muted">Started {new Date(session.startedAt).toLocaleTimeString()}</p>
          <button className="btn" onClick={stop} disabled={busy}>{busy ? 'Stopping...' : 'Stop and log'}</button>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="f-activity">Activity</label>
            <ActivitySelect id="f-activity" value={activity} onChange={setActivity} />
          </div>
          <button className="btn" onClick={start} disabled={busy}>{busy ? 'Starting...' : 'Start'}</button>
        </>
      )}
    </>
  );
}

export default function FocusPage() {
  return <Protected title="Focus timer"><FocusContent /></Protected>;
}
