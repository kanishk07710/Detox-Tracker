'use client';

/**
 * LandingDemo — the interactive hero. Visitors drag five sliders to build a
 * made-up day; the ribbon reshapes live and the line under it says what the
 * social media slice adds up to over a year. Nothing here calls the API.
 */
import { useEffect, useState } from 'react';
import { ACTIVITY_LABEL, WAKING_MINUTES, formatMinutes } from '@/lib/format';
import { ACTIVITIES, type Activity } from '@/types';

type Day = Record<Activity, number>;

const START: Day = { SOCIAL_MEDIA: 95, CODING: 210, STUDY: 60, EXERCISE: 40, OTHER: 35 };
const EMPTY: Day = { SOCIAL_MEDIA: 0, CODING: 0, STUDY: 0, EXERCISE: 0, OTHER: 0 };

export default function LandingDemo() {
  const [day, setDay] = useState<Day>(EMPTY);

  // Start empty and fill on the next frame so the ribbon grows in once on load.
  useEffect(() => {
    const id = requestAnimationFrame(() => setDay(START));
    return () => cancelAnimationFrame(id);
  }, []);

  const sum = ACTIVITIES.reduce((s, a) => s + day[a], 0);
  const basis = Math.max(WAKING_MINUTES, sum);
  const social = day.SOCIAL_MEDIA;
  const daysPerYear = Math.round((social * 365) / 1440);
  const share = Math.round((social / WAKING_MINUTES) * 100);

  return (
    <div className="panel demo">
      <div className="ribbon demo-ribbon" role="img" aria-label={`A sample day: ${formatMinutes(sum)} logged of 16 hours`}>
        {ACTIVITIES.map((a) => (
          <span key={a} className={`c-${a}`} style={{ width: `${(day[a] / basis) * 100}%`, minWidth: 0 }}>
            {day[a] / basis > 0.09 && <b>{formatMinutes(day[a])}</b>}
          </span>
        ))}
      </div>
      <div className="ribbon-scale" aria-hidden="true">
        <span>Wake</span><span>4h</span><span>8h</span><span>12h</span><span>16h</span>
      </div>

      <p className="demo-line" aria-live="polite">
        {social === 0
          ? 'No social media in this day. Drag the first slider to see what it costs.'
          : `${formatMinutes(social)} of social media is ${share}% of your waking day, about ${daysPerYear} full days a year.`}
      </p>

      <div className="sliders">
        {ACTIVITIES.map((a) => (
          <label key={a} className="slider">
            <span className="slider-head">
              <span><span className={`dot c-${a}`} />{ACTIVITY_LABEL[a]}</span>
              <span className="time">{formatMinutes(day[a])}</span>
            </span>
            <input
              type="range" min={0} max={480} step={5} value={day[a]}
              className={`range r-${a}`}
              onChange={(e) => setDay((d) => ({ ...d, [a]: Number(e.target.value) }))}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
