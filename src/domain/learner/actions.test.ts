import { describe, expect, it } from 'vitest';
import {
  addBookmark,
  completeLesson,
  completeOnboarding,
  dueMemorization,
  editPlan,
  recordActivity,
  removeBookmark,
  reviewDua,
  reviewMemorization,
  saveReadingPosition,
  setPlan,
  skipOnboarding,
  startLesson,
  startMemorization,
  updatePreferences,
} from './actions';
import { createInitialLearnerState, LearnerStateSchema, type DailyPlan } from './schema';

const t0 = new Date('2026-03-01T09:00:00Z');
const fresh = () => createInitialLearnerState(t0, 'UTC');

const plan = (items: Partial<DailyPlan['items'][number]>[]): DailyPlan => ({
  date: '2026-03-01',
  generatedAt: t0.toISOString(),
  customized: false,
  items: items.map((i, n) => ({ id: `i${n}`, type: 'lesson', ref: 'x', title: 't', reason: 'r', minutes: 5, href: '/', status: 'pending', ...i })),
});

describe('learner actions', () => {
  it('produces states that always satisfy the persisted schema', () => {
    let s = fresh();
    s = completeOnboarding(s, { goals: ['quran-reading', 'duas'], dailyMinutes: 15, quranReadingLevel: 'can-read', memorizationStage: null, reminder: { enabled: true, time: '06:30' } }, t0);
    s = startLesson(s, { lessonId: 'l1', courseSlug: 'c' }, t0);
    s = completeLesson(s, { lessonId: 'l1', courseSlug: 'c', correct: 2, scored: 3, minutes: 5 }, t0);
    s = saveReadingPosition(s, { surah: 2, verse: 5, verseCount: 286 }, t0);
    s = addBookmark(s, { kind: 'verse', ref: '2:255', label: 'Al-Baqara 2:255' }, t0);
    s = startMemorization(s, { surah: 1, fromVerse: 1, toVerse: 7 }, t0).state;
    expect(() => LearnerStateSchema.parse(s)).not.toThrow();
  });

  describe('onboarding', () => {
    it('stores goals and preferences and de-duplicates goals', () => {
      const s = completeOnboarding(
        fresh(),
        { goals: ['salah', 'salah', 'duas'], dailyMinutes: 5, quranReadingLevel: 'beginner', memorizationStage: 'not-started', reminder: { enabled: false, time: '19:00' } },
        t0,
      );
      expect(s.profile.onboarding).toBe('completed');
      expect(s.preferences.goals).toEqual(['salah', 'duas']);
      expect(s.preferences.dailyMinutes).toBe(5);
    });

    it('can be skipped, but skipping never overrides a completed onboarding', () => {
      expect(skipOnboarding(fresh(), t0).profile.onboarding).toBe('skipped');
      const done = completeOnboarding(fresh(), { goals: [], dailyMinutes: 10, quranReadingLevel: null, memorizationStage: null, reminder: { enabled: false, time: '19:00' } }, t0);
      expect(skipOnboarding(done, t0).profile.onboarding).toBe('completed');
    });

    it('discards an uncustomized plan when goals change, but keeps a customized one', () => {
      const withPlan = setPlan(fresh(), plan([{}]));
      expect(updatePreferences(withPlan, { goals: ['salah'] }, t0).plans['2026-03-01']).toBeUndefined();
      const customized = setPlan(fresh(), { ...plan([{}]), customized: true });
      expect(updatePreferences(customized, { goals: ['salah'] }, t0).plans['2026-03-01']).toBeDefined();
      // Display preferences do not affect the plan.
      expect(updatePreferences(withPlan, { display: { arabicScale: 1.4 } }, t0).plans['2026-03-01']).toBeDefined();
    });
  });

  describe('lessons and activity', () => {
    it('completes a lesson, records time, and ticks the matching plan item', () => {
      let s = setPlan(fresh(), plan([{ type: 'lesson', ref: 'l1' }, { type: 'lesson', ref: 'l2' }]));
      s = startLesson(s, { lessonId: 'l1', courseSlug: 'c' }, t0);
      expect(s.lessons.l1?.status).toBe('in-progress');
      s = completeLesson(s, { lessonId: 'l1', courseSlug: 'c', correct: 3, scored: 4, minutes: 6 }, t0);
      expect(s.lessons.l1).toMatchObject({ status: 'completed', correct: 3, scored: 4, timesCompleted: 1 });
      expect(s.activity['2026-03-01']?.minutes).toBe(6);
      expect(s.plans['2026-03-01']?.items.map((i) => i.status)).toEqual(['done', 'pending']);
    });

    it('re-taking a completed lesson keeps it completed and counts repeats', () => {
      let s = completeLesson(fresh(), { lessonId: 'l1', courseSlug: 'c', correct: 1, scored: 1, minutes: 3 }, t0);
      s = startLesson(s, { lessonId: 'l1', courseSlug: 'c' }, t0);
      expect(s.lessons.l1?.status).toBe('completed');
      s = completeLesson(s, { lessonId: 'l1', courseSlug: 'c', correct: 1, scored: 1, minutes: 3 }, t0);
      expect(s.lessons.l1?.timesCompleted).toBe(2);
    });

    it('groups activity by the learner’s local day', () => {
      const s = updatePreferences(fresh(), { timeZone: 'Asia/Karachi' }, t0); // UTC+5
      const late = new Date('2026-03-01T20:00:00Z'); // already 2 March in Karachi
      const next = recordActivity(s, { type: 'quran-reading', ref: '1', minutes: 4 }, late);
      expect(Object.keys(next.activity)).toEqual(['2026-03-02']);
    });

    it('wildcard plan items are ticked by any matching activity', () => {
      const s = recordActivity(setPlan(fresh(), plan([{ type: 'quran-reading', ref: '*' }])), { type: 'quran-reading', ref: '18', minutes: 5 }, t0);
      expect(s.plans['2026-03-01']?.items[0]?.status).toBe('done');
    });
  });

  describe('plan editing', () => {
    const p = plan([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    it('skips, restores, removes and reorders items, marking the plan customized', () => {
      expect(editPlan(p, { kind: 'skip', itemId: 'b' }).items[1]?.status).toBe('skipped');
      expect(editPlan(editPlan(p, { kind: 'skip', itemId: 'b' }), { kind: 'restore', itemId: 'b' }).items[1]?.status).toBe('pending');
      expect(editPlan(p, { kind: 'remove', itemId: 'a' }).items.map((i) => i.id)).toEqual(['b', 'c']);
      const moved = editPlan(p, { kind: 'move', itemId: 'c', direction: -1 });
      expect(moved.items.map((i) => i.id)).toEqual(['a', 'c', 'b']);
      expect(moved.customized).toBe(true);
    });
    it('ignores moves past the ends and unknown ids', () => {
      expect(editPlan(p, { kind: 'move', itemId: 'a', direction: -1 })).toBe(p);
      expect(editPlan(p, { kind: 'remove', itemId: 'zzz' })).toBe(p);
    });
  });

  describe('Quran reading and bookmarks', () => {
    it('saves the position to resume from and tracks the furthest verse', () => {
      let s = saveReadingPosition(fresh(), { surah: 2, verse: 40, verseCount: 286 }, t0);
      s = saveReadingPosition(s, { surah: 2, verse: 12, verseCount: 286 }, t0);
      expect(s.reading.current).toMatchObject({ surah: 2, verse: 12 });
      expect(s.reading.surahs['2']).toMatchObject({ lastVerse: 12, furthestVerse: 40, completedOn: null });
    });

    it('marks a surah complete when its last verse is reached', () => {
      const s = saveReadingPosition(fresh(), { surah: 112, verse: 4, verseCount: 4 }, t0);
      expect(s.reading.surahs['112']?.completedOn).toBe('2026-03-01');
    });

    it('adds a bookmark once and removes it', () => {
      let s = addBookmark(fresh(), { kind: 'verse', ref: '2:255', label: 'x' }, t0);
      s = addBookmark(s, { kind: 'verse', ref: '2:255', label: 'x' }, t0);
      expect(s.bookmarks).toHaveLength(1);
      s = removeBookmark(s, { kind: 'verse', ref: '2:255' });
      expect(s.bookmarks).toHaveLength(0);
    });
  });

  describe('memorization and revision', () => {
    it('starts an item due today, reviews it, and schedules the next review', () => {
      const started = startMemorization(fresh(), { surah: 112, fromVerse: 1, toVerse: 4 }, t0);
      expect(dueMemorization(started.state, '2026-03-01')).toHaveLength(1);
      const { state, explanation } = reviewMemorization(started.state, { itemId: started.item.id, rating: 'good' }, t0);
      const item = state.memorization[0]!;
      expect(item.srs.dueOn).toBe('2026-03-02');
      expect(item.history).toHaveLength(1);
      expect(item.lastPracticedOn).toBe('2026-03-01');
      expect(explanation).toContain('Next review in 1 day');
      expect(dueMemorization(state, '2026-03-01')).toHaveLength(0);
      expect(dueMemorization(state, '2026-03-02')).toHaveLength(1);
    });

    it('does not create duplicate active items for the same range', () => {
      const a = startMemorization(fresh(), { surah: 1, fromVerse: 1, toVerse: 7 }, t0);
      const b = startMemorization(a.state, { surah: 1, fromVerse: 1, toVerse: 7 }, t0);
      expect(b.state.memorization).toHaveLength(1);
      expect(b.item.id).toBe(a.item.id);
    });

    it('rejects an inverted verse range', () => {
      expect(() => startMemorization(fresh(), { surah: 1, fromVerse: 5, toVerse: 2 }, t0)).toThrow();
    });

    it('ticks the revision plan item only when nothing is left due', () => {
      let s = startMemorization(fresh(), { surah: 1, fromVerse: 1, toVerse: 3 }, t0).state;
      s = startMemorization(s, { surah: 1, fromVerse: 4, toVerse: 7 }, t0).state;
      s = setPlan(s, plan([{ type: 'memorization-review', ref: '*' }]));
      const [first, second] = s.memorization;
      s = reviewMemorization(s, { itemId: first!.id, rating: 'good' }, t0).state;
      expect(s.plans['2026-03-01']?.items[0]?.status).toBe('pending');
      s = reviewMemorization(s, { itemId: second!.id, rating: 'difficult' }, t0).state;
      expect(s.plans['2026-03-01']?.items[0]?.status).toBe('done');
    });

    it('schedules dua revision after practice', () => {
      const { state } = reviewDua(fresh(), { duaId: 'd1', rating: 'again' }, t0);
      expect(state.duas.d1?.srs.dueOn).toBe('2026-03-02');
      expect(state.activity['2026-03-01']?.records[0]?.type).toBe('dua-practice');
    });
  });
});

describe('dua plan items', () => {
  it('ticks a suggested dua by id, and the due-revision item only when nothing is left due', () => {
    let s = createInitialLearnerState(t0, 'UTC');
    s = reviewDua(s, { duaId: 'd1', rating: 'good' }, new Date('2026-02-28T09:00:00Z')).state; // due 03-01
    s = reviewDua(s, { duaId: 'd2', rating: 'good' }, new Date('2026-02-28T09:00:00Z')).state; // due 03-01
    s = setPlan(s, plan([{ type: 'dua-practice', ref: 'due' }, { type: 'dua-practice', ref: 'd3' }]));
    s = reviewDua(s, { duaId: 'd1', rating: 'good' }, t0).state;
    expect(s.plans['2026-03-01']?.items.map((i) => i.status)).toEqual(['pending', 'pending']);
    s = reviewDua(s, { duaId: 'd2', rating: 'easy' }, t0).state;
    expect(s.plans['2026-03-01']?.items.map((i) => i.status)).toEqual(['done', 'pending']);
    s = reviewDua(s, { duaId: 'd3', rating: 'again' }, t0).state;
    expect(s.plans['2026-03-01']?.items.map((i) => i.status)).toEqual(['done', 'done']);
  });
});
