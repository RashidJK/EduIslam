import { describe, expect, it } from 'vitest';
import { completeLesson, recordActivity, reviewMemorization, saveReadingPosition, startMemorization } from '../learner/actions';
import { createInitialLearnerState } from '../learner/schema';
import { achievements, lessonsCompletedThisWeek, memorizationCounts, revisionDueCount, weeklyActivity } from './stats';

const at = (d: string) => new Date(`${d}T10:00:00Z`);

describe('progress stats', () => {
  it('builds the current week with active days', () => {
    let s = createInitialLearnerState(at('2026-03-02'), 'UTC');
    s = recordActivity(s, { type: 'quran-reading', ref: '1', minutes: 4 }, at('2026-03-02'));
    s = recordActivity(s, { type: 'quran-reading', ref: '1', minutes: 6 }, at('2026-03-04'));
    const week = weeklyActivity(s, '2026-03-04');
    expect(week.map((d) => d.active)).toEqual([true, false, true, false, false, false, false]);
    expect(week[2]?.minutes).toBe(6);
  });

  it('counts lesson completions this week only', () => {
    let s = createInitialLearnerState(at('2026-02-25'), 'UTC');
    s = completeLesson(s, { lessonId: 'a', courseSlug: 'c', correct: 1, scored: 1, minutes: 3 }, at('2026-02-25')); // previous week
    s = completeLesson(s, { lessonId: 'b', courseSlug: 'c', correct: 1, scored: 1, minutes: 3 }, at('2026-03-03'));
    s = completeLesson(s, { lessonId: 'b', courseSlug: 'c', correct: 1, scored: 1, minutes: 3 }, at('2026-03-04'));
    expect(lessonsCompletedThisWeek(s, '2026-03-04')).toBe(2);
  });

  it('counts memorization items by derived status and due revision', () => {
    let s = createInitialLearnerState(at('2026-03-01'), 'UTC');
    const a = startMemorization(s, { surah: 112, fromVerse: 1, toVerse: 4 }, at('2026-03-01'));
    s = startMemorization(a.state, { surah: 113, fromVerse: 1, toVerse: 5 }, at('2026-03-01')).state;
    s = reviewMemorization(s, { itemId: a.item.id, rating: 'good' }, at('2026-03-01')).state;
    expect(memorizationCounts(s)).toMatchObject({ 'not-started': 1, learning: 1 });
    expect(revisionDueCount(s, '2026-03-01')).toBe(1);
    expect(revisionDueCount(s, '2026-03-02')).toBe(2);
  });

  it('awards achievements from real activity only', () => {
    let s = createInitialLearnerState(at('2026-03-01'), 'UTC');
    expect(achievements(s, []).filter((a) => a.earned)).toEqual([]);
    s = completeLesson(s, { lessonId: 'a', courseSlug: 'c', correct: 1, scored: 1, minutes: 3 }, at('2026-03-01'));
    s = saveReadingPosition(s, { surah: 112, verse: 4, verseCount: 4 }, at('2026-03-01'));
    const earned = achievements(s, []).filter((x) => x.earned).map((x) => x.id);
    expect(earned).toEqual(['first-lesson', 'reading']);
  });
});
