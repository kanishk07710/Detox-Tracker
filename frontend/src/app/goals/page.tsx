'use client';

import { useCallback, useEffect, useState } from 'react';
import ActivitySelect from '@/components/ActivitySelect';
import Protected from '@/components/Protected';
import { ApiError, errorMessage, goalsApi } from '@/lib/api';
import { ACTIVITY_LABEL, formatMinutes } from '@/lib/format';
import { validateMinutes, type FieldErrors } from '@/lib/validation';
import type { Activity, Goal, GoalType } from '@/types';

function GoalsContent() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity>('SOCIAL_MEDIA');
  const [type, setType] = useState<GoalType>('LIMIT');
  const [minutes, setMinutes] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setGoals(await goalsApi.list());
      setListError(null);
    } catch (e) {
      setListError(errorMessage(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const v = validateMinutes(minutes);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await goalsApi.create({ activity, type, minutes: Number(minutes) });
      setMinutes('');
      await load();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors());
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await goalsApi.remove(id);
      setGoals((cur) => cur && cur.filter((g) => g.id !== id));
    } catch (e) {
      setListError(errorMessage(e));
    }
  }

  return (
    <>
      <p className="muted">
        A target is a minimum per day (e.g. study at least 60m). A limit is a maximum (e.g. social media at most 30m).
      </p>
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="g-activity">Activity</label>
          <ActivitySelect id="g-activity" value={activity} onChange={setActivity} />
        </div>
        <div className="field">
          <label htmlFor="g-type">Type</label>
          <select id="g-type" value={type} onChange={(e) => setType(e.target.value as GoalType)}>
            <option value="LIMIT">Limit (at most)</option>
            <option value="TARGET">Target (at least)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="g-minutes">Minutes per day</label>
          <input id="g-minutes" inputMode="numeric" value={minutes}
                 onChange={(e) => setMinutes(e.target.value)} aria-invalid={!!errors.minutes} />
          {errors.minutes && <div className="err">{errors.minutes}</div>}
        </div>
        {formError && <p className="msg-error" role="alert">{formError}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Add goal'}</button>
      </form>

      <h2>Your goals</h2>
      {listError && <p className="msg-error" role="alert">{listError}</p>}
      {goals === null && !listError && <p className="muted">Loading...</p>}
      {goals && goals.length === 0 && <p className="muted">No goals yet.</p>}
      {goals && goals.length > 0 && (
        <table className="plain">
          <thead><tr><th>Activity</th><th>Type</th><th className="num">Minutes</th><th /></tr></thead>
          <tbody>
            {goals.map((g) => (
              <tr key={g.id}>
                <td>{ACTIVITY_LABEL[g.activity]}</td>
                <td>{g.type === 'LIMIT' ? 'Limit' : 'Target'}</td>
                <td className="num">{formatMinutes(g.minutes)}</td>
                <td><button className="linkbtn danger" onClick={() => remove(g.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function GoalsPage() {
  return <Protected title="Goals"><GoalsContent /></Protected>;
}
