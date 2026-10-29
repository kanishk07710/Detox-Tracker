/**
 * DayRibbon — one bar that represents a 16 hour waking day.
 * Each activity is a segment sized by its minutes; the grey that is left over
 * is time nobody logged. Colour here always means the activity, nothing else.
 */
import { ACTIVITY_LABEL, WAKING_MINUTES, formatMinutes } from '@/lib/format';
import { ACTIVITIES, type Activity } from '@/types';

export default function DayRibbon({ totals }: { totals: Partial<Record<Activity, number>> }) {
  const sum = ACTIVITIES.reduce((s, a) => s + (totals[a] ?? 0), 0);
  // If someone logs more than 16h, shrink to fit instead of overflowing.
  const basis = Math.max(WAKING_MINUTES, sum);
  const summary = ACTIVITIES.filter((a) => (totals[a] ?? 0) > 0)
    .map((a) => `${ACTIVITY_LABEL[a]} ${formatMinutes(totals[a] ?? 0)}`)
    .join(', ');

  return (
    <div>
      <div className="ribbon" role="img" aria-label={summary ? `Today: ${summary}` : 'Nothing logged yet'}>
        {ACTIVITIES.map((a) => {
          const m = totals[a] ?? 0;
          return m > 0 ? <span key={a} className={`c-${a}`} style={{ width: `${(m / basis) * 100}%` }} /> : null;
        })}
      </div>
      <div className="ribbon-scale" aria-hidden="true">
        <span>Wake</span>
        <span>8h</span>
        <span>16h</span>
      </div>
    </div>
  );
}
