'use client';

/**
 * Home — plain landing. If already signed in, go straight to /logs.
 * Client component because the session check needs the browser's cookie.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { authApi } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    authApi.me().then(() => router.replace('/logs')).catch(() => {
      /* not signed in (or server down): just show the links below */
    });
  }, [router]);

  return (
    <main className="page">
      <h1>Detox Tracker</h1>
      <p>Log how you spend your time, set daily goals, and keep a streak.</p>
      <p>
        <Link href="/login">Log in</Link> · <Link href="/register">Register</Link>
      </p>
    </main>
  );
}
