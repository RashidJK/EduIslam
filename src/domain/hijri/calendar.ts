// Hijri date conversion via the platform's ICU calendars (Intl.DateTimeFormat). The
// method is always explicit and shown to the learner, and a per-learner day adjustment
// lets them follow local moon sighting. Dates computed here are *estimates*.
import { addDays, type LocalDateKey, keyToUtcDate } from '../time';
import type { HijriMethod } from '../learner/schema';

/** The twelve Hijri months, in order. */
export const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Ula',
  'Jumada al-Akhirah',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
] as const;

export const HIJRI_METHOD_INFO: Record<HijriMethod, { label: string; description: string }> = {
  'islamic-umalqura': {
    label: 'Umm al-Qura (calculated)',
    description: 'The calculated calendar published for Saudi Arabia. Widely used, but local moon sighting can differ.',
  },
  'islamic-civil': {
    label: 'Tabular — civil',
    description: 'A fixed arithmetical calendar. Simple and predictable, not based on observation.',
  },
  'islamic-tbla': {
    label: 'Tabular — astronomical epoch',
    description: 'The arithmetical calendar with an astronomical starting point. Not based on observation.',
  },
  islamic: {
    label: 'Astronomical estimate',
    description: 'An astronomical approximation provided by your device. Not based on observation.',
  },
};

export interface HijriDate {
  year: number;
  month: number; // 1–12
  day: number;
}

export interface HijriOptions {
  method: HijriMethod;
  /** Days added to the calculated date to follow local sighting (−2…+2). */
  dayAdjustment: number;
}

const formatters = new Map<HijriMethod, Intl.DateTimeFormat | null>();

function formatterFor(method: HijriMethod): Intl.DateTimeFormat | null {
  if (formatters.has(method)) return formatters.get(method)!;
  let f: Intl.DateTimeFormat | null = null;
  try {
    const candidate = new Intl.DateTimeFormat(`en-u-ca-${method}`, { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
    // Unsupported calendars silently fall back to Gregorian; treat that as unavailable.
    if (candidate.resolvedOptions().calendar === method) f = candidate;
  } catch {
    f = null;
  }
  formatters.set(method, f);
  return f;
}

export function isHijriMethodSupported(method: HijriMethod): boolean {
  return formatterFor(method) !== null;
}

/** Converts a local calendar day to a Hijri date, or null if the device cannot compute it. */
export function toHijri(key: LocalDateKey, opts: HijriOptions): HijriDate | null {
  const f = formatterFor(opts.method);
  if (!f) return null;
  const parts = f.formatToParts(keyToUtcDate(addDays(key, opts.dayAdjustment)));
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const date = { year: num('year'), month: num('month'), day: num('day') };
  if (![date.year, date.month, date.day].every(Number.isFinite) || date.month < 1 || date.month > 12) return null;
  return date;
}

export function formatHijri(date: HijriDate): string {
  return `${date.day} ${HIJRI_MONTHS[date.month - 1]} ${date.year} AH`;
}

export function hijriMonthName(month: number): string {
  return HIJRI_MONTHS[month - 1] ?? `Month ${month}`;
}

// ---------------------------------------------------------------- occasion date rules

export type HijriRule =
  | { kind: 'day'; month: number; day: number }
  | { kind: 'range'; month: number; fromDay: number; toDay: number }
  | { kind: 'month'; month: number }
  /** The last N nights of a month, whose length (29 or 30) is only known per year. */
  | { kind: 'last-nights'; month: number; nights: number };

export interface Occurrence {
  start: LocalDateKey;
  end: LocalDateKey;
  hijriYear: number;
  /** True when today falls inside the occurrence. */
  ongoing: boolean;
}

const SEARCH_DAYS = 400;

/** Gregorian start/end of a Hijri month in a given year, found by scanning nearby days. */
export function hijriMonthSpan(year: number, month: number, around: LocalDateKey, opts: HijriOptions): { start: LocalDateKey; end: LocalDateKey } | null {
  let start: LocalDateKey | null = null;
  let end: LocalDateKey | null = null;
  for (let i = -SEARCH_DAYS; i <= SEARCH_DAYS; i++) {
    const key = addDays(around, i);
    const h = toHijri(key, opts);
    if (!h) return null;
    if (h.year === year && h.month === month) {
      start ??= key;
      end = key;
    } else if (start) {
      break;
    }
  }
  return start && end ? { start, end } : null;
}

function spanForRule(rule: HijriRule, year: number, around: LocalDateKey, opts: HijriOptions): { start: LocalDateKey; end: LocalDateKey } | null {
  const month = hijriMonthSpan(year, rule.month, around, opts);
  if (!month) return null;
  switch (rule.kind) {
    case 'month':
      return month;
    case 'day':
      return { start: addDays(month.start, rule.day - 1), end: addDays(month.start, rule.day - 1) };
    case 'range':
      return { start: addDays(month.start, rule.fromDay - 1), end: addDays(month.start, rule.toDay - 1) };
    case 'last-nights':
      // The nights precede the final days of the month; we show the closing days as the span.
      return { start: addDays(month.end, -(rule.nights - 1)), end: month.end };
  }
}

/** The current or next occurrence of a rule on or after `today`. */
export function nextOccurrence(rule: HijriRule, today: LocalDateKey, opts: HijriOptions): Occurrence | null {
  const h = toHijri(today, opts);
  if (!h) return null;
  for (const year of [h.year, h.year + 1]) {
    // Search around the expected position of that month to keep scans short.
    const monthsAhead = (year - h.year) * 12 + (rule.month - h.month);
    const around = addDays(today, Math.round(monthsAhead * 29.53));
    const span = spanForRule(rule, year, around, opts);
    if (span && span.end >= today) return { ...span, hijriYear: year, ongoing: span.start <= today };
  }
  return null;
}

export function uncertaintyNote(opts: HijriOptions): string {
  const method = HIJRI_METHOD_INFO[opts.method].label;
  const adj = opts.dayAdjustment === 0 ? '' : ` with a ${opts.dayAdjustment > 0 ? '+' : ''}${opts.dayAdjustment}-day local adjustment`;
  return `Estimated using ${method}${adj}. Dates can differ by a day or two depending on moon sighting and where you live — confirm with your local mosque or Islamic authority.`;
}
