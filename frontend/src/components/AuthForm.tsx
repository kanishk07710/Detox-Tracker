'use client';

/** Shared form for /login and /register (they differ only in the API call). */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, authApi, errorMessage } from '@/lib/api';
import { validateCredentials, type FieldErrors } from '@/lib/validation';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    // For login we only require non-empty values; the server decides validity
    // (and gives one generic message so we do not leak which emails exist).
    const v = isLogin
      ? { ...(email ? {} : { email: 'Enter your email.' }), ...(password ? {} : { password: 'Enter your password.' }) }
      : validateCredentials(email, password);
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    try {
      await (isLogin ? authApi.login : authApi.register)(email, password);
      router.replace('/logs');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setFormError(err.message);
      } else {
        setFormError(errorMessage(err));
      }
      setBusy(false);
    }
  }

  return (
    <main className="page" style={{ maxWidth: '24rem' }}>
      <h1>{isLogin ? 'Log in' : 'Create account'}</h1>
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email}
                 onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
          {errors.email && <div className="err">{errors.email}</div>}
        </div>
        <div className="field">
          <label htmlFor="password">Password{isLogin ? '' : ' (at least 8 characters)'}</label>
          <input id="password" type="password" value={password}
                 autoComplete={isLogin ? 'current-password' : 'new-password'}
                 onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
          {errors.password && <div className="err">{errors.password}</div>}
        </div>
        {formError && <p className="msg-error" role="alert">{formError}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Please wait...' : isLogin ? 'Log in' : 'Create account'}
        </button>
      </form>
      <p className="muted" style={{ marginTop: '1rem' }}>
        {isLogin ? (
          <>No account? <Link href="/register">Register</Link></>
        ) : (
          <>Already registered? <Link href="/login">Log in</Link></>
        )}
      </p>
    </main>
  );
}
