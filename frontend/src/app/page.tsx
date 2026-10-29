'use client';

/**
 * Home — the landing page. If already signed in (or a guest), go straight to /logs.
 * Client component because the session check needs the browser's cookie.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import FocusTile from '@/components/FocusTile';
import GuestButton from '@/components/GuestButton';
import LandingDemo from '@/components/LandingDemo';
import { authApi } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    authApi.me().then(() => router.replace('/logs')).catch(() => {
      /* not signed in (or server down): just show the page below */
    });
  }, [router]);

  return (
    <main className="landing">
      <header className="landing-nav">
        <span className="brand">Detox Tracker</span>
        <nav aria-label="Account">
          <Link href="/login">Log in</Link>
          <Link href="/register" className="btn">Create account</Link>
        </nav>
      </header>

      <section className="hero">
        <h1>See where your day actually goes.</h1>
        <p className="lede">
          Log time as you spend it, set a daily limit on social media, and keep a streak going on the days you stay under it.
        </p>
        <div className="cta">
          <GuestButton className="btn big" />
          <Link href="/register" className="btn big secondary">Create account</Link>
        </div>
        <p className="muted">Guest mode keeps everything in this browser. No account, no server.</p>
      </section>

      <section aria-labelledby="demo-h">
        <h2 id="demo-h" className="sr-only">Build a sample day</h2>
        <LandingDemo />
      </section>

      <section className="bento" aria-label="What you can do">
        <article className="tile tile-wide">
          <h3>Log in seconds</h3>
          <p>Pick an activity, enter the minutes, add a note if you want one. Your day fills in as you go.</p>
          <div className="mini-ribbon" aria-hidden="true">
            <span className="c-CODING" style={{ flex: 5 }} />
            <span className="c-SOCIAL_MEDIA" style={{ flex: 2 }} />
            <span className="c-STUDY" style={{ flex: 3 }} />
            <span className="c-EXERCISE" style={{ flex: 1 }} />
          </div>
        </article>
        <article className="tile">
          <h3>Limits and targets</h3>
          <p>At most 30 minutes of social media. At least an hour of study.</p>
          <div className="bar" aria-hidden="true"><div className="c-SOCIAL_MEDIA" style={{ width: '72%' }} /></div>
        </article>
        <article className="tile">
          <h3>Focus timer</h3>
          <p>Start it, work, stop it. The time is logged for you.</p>
          <FocusTile />
        </article>
      </section>

      <footer className="landing-foot">
        <span className="muted">Detox Tracker</span>
        <Link href="/login">Log in</Link>
      </footer>
    </main>
  );
}
