import { describe, expect, it } from 'vitest';
import { deriveMemorizationStatus } from './status';
import { simpleScheduler, type Rating, type SrsState } from '../srs/scheduler';
import type { ReviewEntry } from '../learner/schema';

function run(ratings: Rating[]): { srs: SrsState; history: ReviewEntry[] } {
  let srs = simpleScheduler.initial('2026-01-01');
  let day = '2026-01-01';
  const history: ReviewEntry[] = [];
  for (const rating of ratings) {
    srs = simpleScheduler.review(srs, rating, day).state;
    history.push({ on: day, at: `${day}T10:00:00.000Z`, rating });
    day = srs.dueOn;
  }
  return { srs, history };
}

describe('deriveMemorizationStatus', () => {
  it('is not-started without any review', () => {
    const { srs, history } = run([]);
    expect(deriveMemorizationStatus(srs, history)).toBe('not-started');
  });

  it('stays "learning" after a single success — clicking once never marks it memorized', () => {
    const { srs, history } = run(['easy']);
    expect(deriveMemorizationStatus(srs, history)).toBe('learning');
  });

  it('falls back to learning after "again"', () => {
    const { srs, history } = run(['good', 'good', 'good', 'again']);
    expect(deriveMemorizationStatus(srs, history)).toBe('learning');
  });

  it('progresses through statuses with spaced successful reviews', () => {
    expect(deriveMemorizationStatus(...Object.values(run(['good', 'good'])) as [SrsState, ReviewEntry[]])).toBe('recently-memorized');
    expect(deriveMemorizationStatus(...Object.values(run(['good', 'good', 'good'])) as [SrsState, ReviewEntry[]])).toBe('in-revision');
    expect(deriveMemorizationStatus(...Object.values(run(['good', 'good', 'good', 'good', 'good'])) as [SrsState, ReviewEntry[]])).toBe(
      'consistently-recalled',
    );
  });
});
