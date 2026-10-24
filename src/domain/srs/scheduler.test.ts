import { describe, expect, it } from 'vitest';
import { describeDue, isDue, simpleScheduler, MIN_EASE, MAX_INTERVAL_DAYS, type SrsState } from './scheduler';

const today = '2026-03-01';

function reviewSequence(ratings: Parameters<typeof simpleScheduler.review>[1][]): SrsState {
  let state = simpleScheduler.initial(today);
  let day = today;
  for (const r of ratings) {
    state = simpleScheduler.review(state, r, day).state;
    day = state.dueOn;
  }
  return state;
}

describe('simpleScheduler', () => {
  it('starts due today with no reviews', () => {
    const s = simpleScheduler.initial(today);
    expect(s.dueOn).toBe(today);
    expect(isDue(s, today)).toBe(true);
    expect(describeDue(s, today)).toBe('Ready for first practice');
  });

  it('schedules "good" reviews at 1, 3, then ease-multiplied days', () => {
    const s0 = simpleScheduler.initial(today);
    const r1 = simpleScheduler.review(s0, 'good', today);
    expect(r1.state.intervalDays).toBe(1);
    expect(r1.state.dueOn).toBe('2026-03-02');
    const r2 = simpleScheduler.review(r1.state, 'good', '2026-03-02');
    expect(r2.state.intervalDays).toBe(3);
    const r3 = simpleScheduler.review(r2.state, 'good', '2026-03-05');
    expect(r3.state.intervalDays).toBe(Math.round(3 * 2.5));
  });

  it('resets progress and lowers ease on "again"', () => {
    const before = reviewSequence(['good', 'good', 'good']);
    const { state, explanation } = simpleScheduler.review(before, 'again', before.dueOn);
    expect(state.repetitions).toBe(0);
    expect(state.lapses).toBe(1);
    expect(state.intervalDays).toBe(1);
    expect(state.ease).toBeLessThan(before.ease);
    expect(explanation).toMatch(/tomorrow/);
  });

  it('grows "easy" faster than "good" and "difficult" slower', () => {
    const base = reviewSequence(['good', 'good']);
    const day = base.dueOn;
    const easy = simpleScheduler.review(base, 'easy', day).state.intervalDays;
    const good = simpleScheduler.review(base, 'good', day).state.intervalDays;
    const difficult = simpleScheduler.review(base, 'difficult', day).state.intervalDays;
    expect(easy).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(difficult);
    expect(difficult).toBeGreaterThanOrEqual(1);
  });

  it('never drops ease below the minimum or exceeds the interval cap', () => {
    const lowEase = reviewSequence(Array(20).fill('again'));
    expect(lowEase.ease).toBeGreaterThanOrEqual(MIN_EASE);
    const long = reviewSequence(Array(30).fill('easy'));
    expect(long.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it('explains every outcome with the next review gap', () => {
    for (const r of ['again', 'difficult', 'good', 'easy'] as const) {
      const { explanation, state } = simpleScheduler.review(simpleScheduler.initial(today), r, today);
      expect(explanation).toContain(`Next review in ${state.intervalDays === 1 ? '1 day' : `${state.intervalDays} days`}`);
    }
  });

  it('describes overdue and upcoming reviews', () => {
    const s = simpleScheduler.review(simpleScheduler.initial(today), 'good', today).state; // due 03-02
    expect(describeDue(s, '2026-03-01')).toBe('Due tomorrow');
    expect(describeDue(s, '2026-03-02')).toBe('Due today');
    expect(describeDue(s, '2026-03-05')).toBe('Overdue by 3 days');
    expect(isDue(s, '2026-03-01')).toBe(false);
  });
});
