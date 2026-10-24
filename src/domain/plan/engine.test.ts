import { describe, expect, it } from 'vitest';
import { alternativeFor, fitToBudget, generateDailyPlan, planCandidates, planTotals, type PlanContext } from './engine';

const base: PlanContext = {
  today: '2026-03-01',
  now: new Date('2026-03-01T08:00:00Z'),
  goals: [],
  dailyMinutes: 10,
  dueMemorizationCount: 0,
  activeMemorizationCount: 0,
  dueDuaCount: 0,
  reading: null,
  inProgressLesson: null,
  nextLessons: [],
  nextDua: null,
  nextSalah: null,
  nextStory: null,
  calendarVisitedRecently: false,
};

const arabicLesson = { lessonId: 'letters-1', title: 'Letters 1', courseTitle: 'Arabic letters', category: 'arabic-reading' as const, minutes: 5 };
const guideLesson = { lessonId: 'guide-1', title: 'How revision works', courseTitle: 'Getting started', category: 'getting-started' as const, minutes: 3 };

describe('daily plan engine', () => {
  it('always suggests at least one activity, even with no goals or content', () => {
    const plan = generateDailyPlan(base);
    expect(plan.items.length).toBeGreaterThanOrEqual(1);
    expect(plan.items[0]?.type).toBe('quran-reading');
    expect(plan.customized).toBe(false);
  });

  it('prioritizes overdue memorization revision before everything else', () => {
    const plan = generateDailyPlan({
      ...base,
      goals: ['quran-reading', 'arabic-reading', 'quran-memorization'],
      dueMemorizationCount: 3,
      activeMemorizationCount: 3,
      nextLessons: [arabicLesson],
      dailyMinutes: 20,
    });
    expect(plan.items[0]?.type).toBe('memorization-review');
    expect(plan.items[0]?.reason).toContain('3 memorized passages are due');
    // With revision due, no new memorization is suggested.
    expect(plan.items.some((i) => i.type === 'memorization-new')).toBe(false);
  });

  it('resumes an unfinished lesson before starting new goal content', () => {
    const plan = generateDailyPlan({ ...base, goals: ['arabic-reading'], inProgressLesson: guideLesson, nextLessons: [arabicLesson], dailyMinutes: 15 });
    expect(plan.items[0]?.id).toBe('lesson:guide-1');
    expect(plan.items[0]?.title).toMatch(/^Continue:/);
    expect(plan.items.map((i) => i.id)).toContain('lesson:letters-1');
  });

  it('only includes activities matching the selected goals', () => {
    const plan = generateDailyPlan({ ...base, goals: ['arabic-reading'], nextLessons: [arabicLesson, guideLesson], dailyMinutes: 20 });
    expect(plan.items.map((i) => i.id)).toEqual(['lesson:letters-1']);
  });

  it('does not suggest the same lesson twice', () => {
    const plan = generateDailyPlan({ ...base, goals: ['arabic-reading', 'daily-habit'], inProgressLesson: arabicLesson, nextLessons: [arabicLesson, guideLesson], dailyMinutes: 20 });
    const ids = plan.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([5, 10, 15, 20])('respects a %i-minute budget', (budget) => {
    const plan = generateDailyPlan({
      ...base,
      goals: ['quran-reading', 'arabic-reading', 'daily-habit', 'quran-memorization', 'hijri-calendar'],
      dueMemorizationCount: 4,
      activeMemorizationCount: 4,
      reading: { surah: 2, verse: 10, surahName: 'Al-Baqara' },
      nextLessons: [arabicLesson, guideLesson],
      dailyMinutes: budget,
    });
    expect(planTotals(plan).plannedMinutes).toBeLessThanOrEqual(budget);
    expect(plan.items.length).toBeGreaterThanOrEqual(1);
  });

  it('larger budgets include more activities', () => {
    const ctx = { ...base, goals: ['quran-reading', 'arabic-reading', 'daily-habit', 'hijri-calendar'] as PlanContext['goals'], nextLessons: [arabicLesson, guideLesson] };
    const small = generateDailyPlan({ ...ctx, dailyMinutes: 5 });
    const large = generateDailyPlan({ ...ctx, dailyMinutes: 20 });
    expect(large.items.length).toBeGreaterThan(small.items.length);
  });

  it('shrinks flexible items to fit and skips rigid ones that do not', () => {
    const items = fitToBudget(
      [
        { id: 'a', type: 'quran-reading', ref: '*', title: 'Read', reason: '', minutes: 8, href: '/', flexible: true, minMinutes: 3 },
        { id: 'b', type: 'lesson', ref: 'x', title: 'Lesson', reason: '', minutes: 5, href: '/', flexible: false, minMinutes: 5 },
        { id: 'c', type: 'calendar', ref: '*', title: 'Calendar', reason: '', minutes: 2, href: '/', flexible: false, minMinutes: 2 },
      ],
      10,
    );
    expect(items.map((i) => [i.id, i.minutes])).toEqual([
      ['a', 8],
      ['c', 2],
    ]);
  });

  it('links reading to the saved position', () => {
    const [item] = planCandidates({ ...base, goals: ['quran-reading'], reading: { surah: 18, verse: 22, surahName: 'Al-Kahf' } });
    expect(item?.href).toBe('/quran/18?verse=22');
    expect(item?.reason).toContain('verse 22');
  });

  it('only suggests calendar check-ins when not visited recently', () => {
    expect(planCandidates({ ...base, goals: ['hijri-calendar'] }).some((c) => c.type === 'calendar')).toBe(true);
    expect(planCandidates({ ...base, goals: ['hijri-calendar'], calendarVisitedRecently: true }).some((c) => c.type === 'calendar')).toBe(false);
  });

  it('offers an alternative that is not already in the plan', () => {
    const ctx = { ...base, goals: ['quran-reading', 'arabic-reading', 'daily-habit'] as PlanContext['goals'], nextLessons: [arabicLesson, guideLesson], dailyMinutes: 5 };
    const plan = generateDailyPlan(ctx);
    const first = plan.items[0]!;
    const alt = alternativeFor(plan, first.id, ctx);
    expect(alt).not.toBeNull();
    expect(plan.items.map((i) => i.id)).not.toContain(alt!.id);
  });
});
