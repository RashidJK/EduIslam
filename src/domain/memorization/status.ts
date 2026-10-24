// Memorization status is *derived* from review history. A passage is never marked
// memorized because someone pressed "complete"; it moves through statuses only as
// self-assessed reviews accumulate.
import type { ReviewEntry } from '../learner/schema';
import type { SrsState } from '../srs/scheduler';

export const MEMORIZATION_STATUSES = ['not-started', 'learning', 'recently-memorized', 'in-revision', 'consistently-recalled'] as const;
export type MemorizationStatus = (typeof MEMORIZATION_STATUSES)[number];

export const MEMORIZATION_STATUS_LABELS: Record<MemorizationStatus, string> = {
  'not-started': 'Not started',
  learning: 'Learning',
  'recently-memorized': 'Recently memorized',
  'in-revision': 'In revision',
  'consistently-recalled': 'Consistently recalled',
};

export const MEMORIZATION_STATUS_HELP: Record<MemorizationStatus, string> = {
  'not-started': 'No practice recorded yet.',
  learning: 'Still building recall — reviews come back frequently.',
  'recently-memorized': 'Recalled successfully a few times; short gaps between reviews.',
  'in-revision': 'Recalled well across a week or more of spaced reviews.',
  'consistently-recalled': 'Recalled well over a month of spaced reviews. Keep revising.',
};

const isSuccess = (r: ReviewEntry) => r.rating === 'good' || r.rating === 'easy';

export function deriveMemorizationStatus(srs: SrsState, history: readonly ReviewEntry[]): MemorizationStatus {
  if (history.length === 0) return 'not-started';
  const last = history[history.length - 1];
  if (!last || last.rating === 'again' || srs.repetitions < 2) return 'learning';
  const lastThree = history.slice(-3);
  if (srs.intervalDays >= 30 && lastThree.length === 3 && lastThree.every(isSuccess)) return 'consistently-recalled';
  if (srs.intervalDays >= 7) return 'in-revision';
  return 'recently-memorized';
}

export function passageLabel(surahName: string, surah: number, fromVerse: number, toVerse: number): string {
  const range = fromVerse === toVerse ? `${fromVerse}` : `${fromVerse}–${toVerse}`;
  return `${surahName} (${surah}:${range})`;
}
