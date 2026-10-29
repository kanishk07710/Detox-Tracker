'use client';

/**
 * Protected — wraps every signed-in page.
 *
 * WHY client-side check: the session cookie belongs to the API origin, so
 * Next.js server code cannot see it. We ask GET /api/auth/me instead and
 * redirect to /login on 401. (The backend still enforces auth on every route;
 * this is only for navigation.)
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, authApi, errorMessage } from '@/lib/api';
import type { User } from '@/types';

const LINKS = [
  ['/logs', 'Logs'],
  ['/dashboard', 'Dashboard'],
  ['/focus', 'Focus'],
  ['/goals', 'Goals'],
  ['/analytics', 'Analytics'],
] as const;

export default function Protected({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authApi
      .me()
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login');
        else setError(errorMessage(e));
      });
  }, [router]);

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      /* even if logout fails, send them to login; the cookie will expire */
    }
    router.replace('/login');
  }

  if (error) return <main className="page"><p className="msg-error" role="alert">{error}</p></main>;
  if (!user) return <main className="page"><p className="muted">Loading...</p></main>;

  return (
    <div className="shell">
      <nav className="rail" aria-label="Main">
        <span className="brand">Detox Tracker</span>
        <div className="links">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>
              {label}
            </Link>
          ))}
        </div>
        <button className="linkbtn out" onClick={logout}>Log out</button>
      </nav>
      <main className="content">
        <h1>{title}</h1>
        {children}
      </main>
    </div>
  );
}
