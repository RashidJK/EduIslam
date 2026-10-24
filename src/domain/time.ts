// Date helpers. Learning activity is grouped by the learner's *local* calendar day,
// so every function takes an explicit IANA time zone instead of relying on the host.

/** A local calendar day formatted as YYYY-MM-DD. */
export type LocalDateKey = string;

const keyFormatters = new Map<string, Intl.DateTimeFormat>();

function keyFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = keyFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    keyFormatters.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    keyFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function toLocalDateKey(date: Date, timeZone: string): LocalDateKey {
  const parts = keyFormatter(isValidTimeZone(timeZone) ? timeZone : 'UTC').formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Calendar arithmetic on date keys, independent of time zones and DST. */
export function addDays(key: LocalDateKey, days: number): LocalDateKey {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function diffDays(from: LocalDateKey, to: LocalDateKey): number {
  const toUtc = (k: LocalDateKey) => {
    const [y, m, d] = k.split('-').map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/** Monday-start week containing `key`, as 7 date keys. */
export function weekOf(key: LocalDateKey): LocalDateKey[] {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = addDays(key, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function keyToUtcDate(key: LocalDateKey): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formatDateKey(key: LocalDateKey, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(keyToUtcDate(key));
}

export type Clock = () => Date;
export const systemClock: Clock = () => new Date();
