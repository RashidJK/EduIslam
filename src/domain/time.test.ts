import { describe, expect, it } from 'vitest';
import { addDays, diffDays, isValidTimeZone, toLocalDateKey, weekOf } from './time';

describe('time helpers', () => {
  it('derives the local calendar day from the time zone, not UTC', () => {
    const instant = new Date('2026-03-01T22:30:00Z');
    expect(toLocalDateKey(instant, 'UTC')).toBe('2026-03-01');
    expect(toLocalDateKey(instant, 'Africa/Nairobi')).toBe('2026-03-02'); // UTC+3
    expect(toLocalDateKey(instant, 'America/New_York')).toBe('2026-03-01');
  });

  it('falls back to UTC for an invalid time zone', () => {
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(toLocalDateKey(new Date('2026-03-01T12:00:00Z'), 'Not/AZone')).toBe('2026-03-01');
  });

  it('does calendar arithmetic across month and leap boundaries', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-03-01', '2026-03-31')).toBe(30);
  });

  it('builds a Monday-start week', () => {
    const week = weekOf('2026-03-04'); // a Wednesday
    expect(week[0]).toBe('2026-03-02');
    expect(week[6]).toBe('2026-03-08');
    expect(weekOf('2026-03-08')[0]).toBe('2026-03-02'); // Sunday belongs to the same week
  });
});
