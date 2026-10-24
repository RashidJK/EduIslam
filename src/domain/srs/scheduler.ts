// A deliberately simple, transparent spaced-repetition scheduler (a light SM-2 variant).
// Every outcome comes with a plain-language explanation so learners can see *why* an
// item is due. The `Scheduler` interface keeps the algorithm swappable.
import { addDays, diffDays, type LocalDateKey } from '../time';

export const RATINGS = ['again', 'difficult', 'good', 'easy'] as const;
export type Rating = (typeof RATINGS)[number];

export const RATING_LABELS: Record<Rating, string> = {
  again: 'Again',
  difficult: 'Difficult',
  good: 'Good',
  easy: 'Easy',
};

export const RATING_DESCRIPTIONS: Record<Rating, string> = {
  again: "I couldn't recall it yet",
  difficult: 'I recalled it with real effort',
  good: 'I recalled it with small hesitations',
  easy: 'I recalled it smoothly',
};

export interface SrsState {
  /** Days between the last review and the next one. 0 = not yet reviewed. */
  intervalDays: number;
  /** Growth factor applied to intervals after a "good" review. */
  ease: number;
  /** Consecutive successful reviews since the last "again". */
  repetitions: number;
  lapses: number;
  dueOn: LocalDateKey;
  lastReviewedOn: LocalDateKey | null;
}

export interface ScheduleResult {
  state: SrsState;
  explanation: string;
}

export interface Scheduler {
  initial(today: LocalDateKey): SrsState;
  review(state: SrsState, rating: Rating, today: LocalDateKey): ScheduleResult;
}

export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const DEFAULT_EASE = 2.5;
export const MAX_INTERVAL_DAYS = 365;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function plural(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}

export const simpleScheduler: Scheduler = {
  initial(today) {
    return { intervalDays: 0, ease: DEFAULT_EASE, repetitions: 0, lapses: 0, dueOn: today, lastReviewedOn: null };
  },

  review(state, rating, today) {
    let { ease, repetitions, lapses } = state;
    let interval: number;
    let reason: string;

    switch (rating) {
      case 'again':
        lapses += 1;
        repetitions = 0;
        ease = clamp(ease - 0.2, MIN_EASE, MAX_EASE);
        interval = 1;
        reason = 'You chose "Again", so it comes back tomorrow for another try.';
        break;
      case 'difficult':
        ease = clamp(ease - 0.15, MIN_EASE, MAX_EASE);
        interval = Math.max(1, Math.round(state.intervalDays * 1.2));
        repetitions += 1;
        reason = 'You found it difficult, so the gap grows only slightly.';
        break;
      case 'good':
        repetitions += 1;
        interval = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.round(Math.max(1, state.intervalDays) * ease);
        reason = 'You recalled it well, so the gap grows.';
        break;
      case 'easy':
        repetitions += 1;
        ease = clamp(ease + 0.15, MIN_EASE, MAX_EASE);
        interval = repetitions === 1 ? 3 : Math.round(Math.max(1, state.intervalDays) * ease * 1.3);
        reason = 'It felt easy, so the gap grows more than usual.';
        break;
    }

    interval = clamp(interval, 1, MAX_INTERVAL_DAYS);
    const next: SrsState = {
      intervalDays: interval,
      ease: Math.round(ease * 100) / 100,
      repetitions,
      lapses,
      dueOn: addDays(today, interval),
      lastReviewedOn: today,
    };
    return { state: next, explanation: `${reason} Next review in ${plural(interval)}.` };
  },
};

export function isDue(state: SrsState, today: LocalDateKey): boolean {
  return diffDays(state.dueOn, today) >= 0;
}

export function daysOverdue(state: SrsState, today: LocalDateKey): number {
  return Math.max(0, diffDays(state.dueOn, today));
}

export function describeDue(state: SrsState, today: LocalDateKey): string {
  if (state.lastReviewedOn === null) return 'Ready for first practice';
  const d = diffDays(today, state.dueOn);
  if (d < 0) return `Overdue by ${plural(-d)}`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${plural(d)}`;
}
