/**
 * Client-side validation mirroring backend rules. This is only for fast
 * feedback; the backend is still the source of truth.
 */
export type FieldErrors = Record<string, string>;

export function validateCredentials(email: string, password: string): FieldErrors {
  const e: FieldErrors = {};
  if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email address.';
  if (password.length < 8) e.password = 'Password must be at least 8 characters.';
  return e;
}

export function validateMinutes(minutes: string): FieldErrors {
  const n = Number(minutes);
  if (!minutes.trim() || !Number.isInteger(n) || n < 1 || n > 1440) {
    return { minutes: 'Minutes must be a whole number from 1 to 1440.' };
  }
  return {};
}

export function validateLog(minutes: string, note: string): FieldErrors {
  const e = validateMinutes(minutes);
  if (note.length > 280) e.note = 'Note must be 280 characters or fewer.';
  return e;
}
