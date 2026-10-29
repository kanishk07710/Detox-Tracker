'use client';

/**
 * Home — the landing page. If already signed in, go straight to /logs.
 * Client component because the session check needs the browser's cookie.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DayRibbon from '@/components/DayRibbon';
import { authApi } from '@/lib/api';

// A made-up day, shown so the ribbon makes sense before anyone has logged.
const EXAMPLE = { SOCIAL_MEDIA: 95, CODING: 210, STUDY: 60, EXERCISE: 40, OTHER: 35 };

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    authApi.me().then(() => router.replace('/logs')).catch(() => {
      /* not signed in (or server down): just show the page below */
    });
  }, [router]);

  return (
    <main className="page" style={{ maxWidth: '40rem', paddingTop: '5rem' }}>
      <span className="brand">Detox Tracker</span>
      <h1 style={{ fontSize: '2.6rem', letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: '30rem' }}>
        See where your day actually goes.
      </h1>
      <p style={{ fontSize: '1.1rem' }}>
        Log time as you spend it, set a daily limit on social media, and keep a streak going on the days you stay under it.
      </p>

      <div style={{ margin: '2.5rem 0' }}>
        <DayRibbon totals={EXAMPLE} />
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          An example day: 16 waking hours, one segment per activity.
        </p>
      </div>

      <p style={{ display: 'flex', gap: '0.75rem' }}>
        <Link href="/register" className="btn" style={{ textDecoration: 'none' }}>Create account</Link>
        <Link href="/login" className="btn secondary" style={{ textDecoration: 'none' }}>Log in</Link>
      </p>
    </main>
  );
}
