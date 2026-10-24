import { describe, expect, it, vi } from 'vitest';
import { formatHijri, hijriMonthSpan, HIJRI_MONTHS, isHijriMethodSupported, nextOccurrence, toHijri, uncertaintyNote } from './calendar';
import { addDays, diffDays } from '../time';

const umm = { method: 'islamic-umalqura', dayAdjustment: 0 } as const;

describe('Hijri calendar', () => {
  it('lists the twelve months in order', () => {
    expect(HIJRI_MONTHS).toHaveLength(12);
    expect(HIJRI_MONTHS[0]).toBe('Muharram');
    expect(HIJRI_MONTHS[8]).toBe('Ramadan');
    expect(HIJRI_MONTHS[11]).toBe('Dhu al-Hijjah');
  });

  it('converts dates with the selected method (computed by ICU, not hard-coded)', () => {
    expect(isHijriMethodSupported('islamic-umalqura')).toBe(true);
    const h = toHijri('2026-10-24', umm);
    expect(h).not.toBeNull();
    // Cross-check against Intl directly so this test never encodes a date by hand.
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(
      new Date(Date.UTC(2026, 9, 24, 12)),
    );
    expect(h!.day).toBe(Number(parts.find((p) => p.type === 'day')!.value));
    expect(h!.year).toBe(Number(parts.find((p) => p.type === 'year')!.value));
  });

  it('applies the local day adjustment', () => {
    const base = toHijri('2026-10-24', umm)!;
    const shifted = toHijri('2026-10-24', { ...umm, dayAdjustment: 1 })!;
    expect(shifted).toEqual(toHijri(addDays('2026-10-24', 1), umm));
    expect(shifted).not.toEqual(base);
  });

  it('advances day by day without gaps', () => {
    let prev = toHijri('2026-01-01', umm)!;
    for (let i = 1; i < 400; i++) {
      const cur = toHijri(addDays('2026-01-01', i), umm)!;
      const sameMonth = cur.month === prev.month && cur.year === prev.year;
      if (sameMonth) expect(cur.day).toBe(prev.day + 1);
      else {
        expect(cur.day).toBe(1);
        expect([29, 30]).toContain(prev.day);
      }
      prev = cur;
    }
  });

  it('finds month spans of 29 or 30 days', () => {
    const today = '2026-10-24';
    const h = toHijri(today, umm)!;
    const span = hijriMonthSpan(h.year, h.month, today, umm)!;
    expect([28, 29]).toContain(diffDays(span.start, span.end));
    expect(toHijri(span.start, umm)!.day).toBe(1);
  });

  it('computes the next occurrence of a day rule, and marks ongoing ranges', () => {
    const today = '2026-10-24';
    const occ = nextOccurrence({ kind: 'day', month: 10, day: 1 }, today, umm)!;
    expect(occ.start >= today).toBe(true);
    expect(toHijri(occ.start, umm)).toMatchObject({ month: 10, day: 1 });
    const current = toHijri(today, umm)!;
    const ongoing = nextOccurrence({ kind: 'month', month: current.month }, today, umm)!;
    expect(ongoing.ongoing).toBe(true);
    expect(ongoing.start <= today && ongoing.end >= today).toBe(true);
  });

  it('handles last-nights rules without assuming month length', () => {
    const occ = nextOccurrence({ kind: 'last-nights', month: 9, nights: 10 }, '2026-10-24', umm)!;
    expect(diffDays(occ.start, occ.end)).toBe(9);
    expect(toHijri(addDays(occ.end, 1), umm)!.month).toBe(10);
  });

  it('reports unsupported methods instead of returning Gregorian dates', () => {
    const real = Intl.DateTimeFormat;
    vi.stubGlobal('Intl', {
      ...Intl,
      DateTimeFormat: function (locale: string, o: Intl.DateTimeFormatOptions) {
        const f = new real('en', o);
        return { formatToParts: f.formatToParts.bind(f), resolvedOptions: () => ({ ...f.resolvedOptions(), calendar: 'gregory', locale }) };
      },
    });
    // Use a method not yet cached by earlier tests.
    expect(isHijriMethodSupported('islamic-tbla')).toBe(false);
    expect(toHijri('2026-10-24', { method: 'islamic-tbla', dayAdjustment: 0 })).toBeNull();
    vi.unstubAllGlobals();
  });

  it('formats dates and always explains uncertainty', () => {
    expect(formatHijri({ year: 1448, month: 9, day: 1 })).toBe('1 Ramadan 1448 AH');
    expect(uncertaintyNote(umm)).toMatch(/moon sighting/);
    expect(uncertaintyNote({ ...umm, dayAdjustment: -1 })).toMatch(/-1-day local adjustment/);
  });
});
