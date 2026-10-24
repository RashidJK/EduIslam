import { describe, expect, it } from 'vitest';
import { bundledCatalog } from '@/data/content/bundled';
import { completeLesson, startLesson, saveReadingPosition, recordActivity } from '@/domain/learner/actions';
import { createInitialLearnerState } from '@/domain/learner/schema';
import { buildPlanContext, type PublishedContent } from './planContext';

const now = new Date('2026-03-04T09:00:00Z');
const content: PublishedContent = {
  courses: bundledCatalog.courses,
  lessons: bundledCatalog.lessons,
  duas: [],
  salahGuides: [],
  stories: [],
  storyCollections: bundledCatalog.storyCollections,
};

describe('buildPlanContext', () => {
  it('offers the first lesson of each course to a new learner', () => {
    const ctx = buildPlanContext(createInitialLearnerState(now, 'UTC'), content, now, '2026-03-04');
    expect(ctx.nextLessons.map((l) => l.lessonId)).toEqual(['gs-daily-plan', 'letters-1']);
    expect(ctx.inProgressLesson).toBeNull();
    expect(ctx.reading).toBeNull();
  });

  it('skips completed lessons and surfaces the in-progress one', () => {
    let s = createInitialLearnerState(now, 'UTC');
    s = completeLesson(s, { lessonId: 'letters-1', courseSlug: 'arabic-letters', correct: 1, scored: 1, minutes: 5 }, now);
    s = startLesson(s, { lessonId: 'letters-2', courseSlug: 'arabic-letters' }, now);
    const ctx = buildPlanContext(s, content, now, '2026-03-04');
    expect(ctx.inProgressLesson?.lessonId).toBe('letters-2');
    expect(ctx.nextLessons.find((l) => l.category === 'arabic-reading')?.lessonId).toBe('letters-3');
  });

  it('includes the reading position with the surah name', () => {
    const s = saveReadingPosition(createInitialLearnerState(now, 'UTC'), { surah: 18, verse: 10, verseCount: 110 }, now);
    const ctx = buildPlanContext(s, content, now, '2026-03-04');
    expect(ctx.reading).toMatchObject({ surah: 18, verse: 10 });
    expect(ctx.reading?.surahName).toBeTruthy();
  });

  it('notices a recent calendar visit', () => {
    const s = recordActivity(createInitialLearnerState(now, 'UTC'), { type: 'calendar', ref: '*', minutes: 1 }, new Date('2026-03-01T09:00:00Z'));
    expect(buildPlanContext(s, content, now, '2026-03-04').calendarVisitedRecently).toBe(true);
    expect(buildPlanContext(s, content, now, '2026-03-12').calendarVisitedRecently).toBe(false);
  });
});
