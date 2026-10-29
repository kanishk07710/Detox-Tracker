/**
 * time.ts — day bucketing in a user's IANA timezone (ADR 004).
 *
 * Model: the database stores UTC instants (JS `Date`). A "day" is a calendar
 * date in the USER's timezone, written as a day key "YYYY-MM-DD". We use only
 * the built-in Intl API, so there are no extra dependencies.
 *
 * WHY never `toLocaleDateString()` without a timeZone: it would use the
 * server's timezone, which is irrelevant (and different on Render vs. laptop).
 */

export type DayKey = string; // 'YYYY-MM-DD'

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True if `tz` is an IANA zone name the runtime understands. */
export function isValidTimeZone(tz: string): boolean {
  try {
    // The constructor throws RangeError for unknown zones.
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** True if the string is a real calendar date like 2024-02-29 (not 2023-02-31). */
export function isValidDayKey(key: string): boolean {
  const m = DAY_KEY_RE.exec(key);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

// Creating a DateTimeFormat is slow; cache one per timezone.
const formatterCache = new Map<string, Intl.DateTimeFormat>();
function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23', // avoid the "24:00" quirk some engines give for midnight
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(tz, f);
  }
  return f;
}

/** Wall-clock fields of an instant as seen in `tz`. */
function wallClock(instant: Date, tz: string) {
  const out: Record<string, number> = {};
  for (const p of formatterFor(tz).formatToParts(instant)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Which calendar day (in `tz`) does this UTC instant fall on? */
export function toDayKey(instant: Date, tz: string): DayKey {
  const w = wallClock(instant, tz);
  return `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`;
}

/** Offset (ms) of `tz` from UTC at the given instant: wall-clock minus real time. */
function offsetMs(instantMs: number, tz: string): number {
  // Drop sub-second part: Intl only reports whole seconds.
  const ms = Math.floor(instantMs / 1000) * 1000;
  const w = wallClock(new Date(ms), tz);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - ms;
}

/**
 * The UTC instant at which local day `key` begins in `tz`.
 *
 * Trick: treat the key's midnight as if it were UTC, subtract the zone offset,
 * then re-check the offset at the result (it may differ across a DST change).
 * If local midnight does not exist (DST gap), this lands on the first valid
 * instant after the gap, which is what we want for a range start.
 */
export function startOfDay(key: DayKey, tz: string): Date {
  const m = DAY_KEY_RE.exec(key);
  if (!m) throw new Error(`Invalid day key: ${key}`);
  const asUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const first = asUtc - offsetMs(asUtc, tz);
  return new Date(asUtc - offsetMs(first, tz));
}

/** Calendar arithmetic on day keys. Pure date math; no timezone involved. */
export function addDays(key: DayKey, n: number): DayKey {
  const m = DAY_KEY_RE.exec(key);
  if (!m) throw new Error(`Invalid day key: ${key}`);
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
  return dt.toISOString().slice(0, 10);
}

/** [start, end) UTC instants of a local day. Its length is 23/24/25h around DST. */
export function dayBounds(key: DayKey, tz: string): { start: Date; end: Date } {
  return { start: startOfDay(key, tz), end: startOfDay(addDays(key, 1), tz) };
}

/** `count` consecutive day keys ending at (and including) `endKey`, oldest first. */
export function lastNDays(endKey: DayKey, count: number): DayKey[] {
  return Array.from({ length: count }, (_, i) => addDays(endKey, i - (count - 1)));
}
