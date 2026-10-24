// Rule-based daily plan generation. No AI involved: candidates are produced from the
// learner's goals, due revision, unfinished work, and available *published* content, then
// fitted to the chosen time budget. Every item carries a plain-language reason.
import type { GoalId } from '../learner/goals';
import type { ActivityType, DailyPlan, PlanItem } from '../learner/schema';
import type { CourseCategory } from '../lessons/schema';
import type { LocalDateKey } from '../time';

export interface LessonCandidate {
  lessonId: string;
  title: string;
  courseTitle: string;
  category: CourseCategory;
  minutes: number;
}

export interface PlanContext {
  today: LocalDateKey;
  now: Date;
  goals: readonly GoalId[];
  dailyMinutes: number;
  dueMemorizationCount: number;
  activeMemorizationCount: number;
  dueDuaCount: number;
  reading: { surah: number; verse: number; surahName: string } | null;
  inProgressLesson: LessonCandidate | null;
  /** The next not-yet-completed lesson of each published course, in course order. */
  nextLessons: readonly LessonCandidate[];
  nextDua: { id: string; slug: string; title: string } | null;
  nextSalah: { slug: string; title: string; minutes: number } | null;
  nextStory: { slug: string; title: string; collection: 'prophets' | 'history'; minutes: number } | null;
  calendarVisitedRecently: boolean;
}

interface Candidate extends Omit<PlanItem, 'status'> {
  /** Flexible items can shrink to fit the remaining budget. */
  flexible: boolean;
  minMinutes: number;
}

const GOAL_CATEGORIES: Partial<Record<GoalId, readonly CourseCategory[]>> = {
  'arabic-reading': ['arabic-reading'],
  'quran-meaning': ['quran-meaning', 'vocabulary'],
  foundations: ['foundations', 'pillars-of-islam', 'pillars-of-iman', 'character', 'fiqh', 'hadith', 'scholars'],
  salah: ['salah'],
  'daily-habit': ['getting-started'],
};

function candidate(
  type: ActivityType,
  ref: string,
  fields: { title: string; reason: string; minutes: number; href: string; flexible?: boolean; minMinutes?: number },
): Candidate {
  return {
    id: `${type}:${ref}`,
    type,
    ref,
    title: fields.title,
    reason: fields.reason,
    minutes: Math.max(1, Math.round(fields.minutes)),
    href: fields.href,
    flexible: fields.flexible ?? false,
    minMinutes: fields.minMinutes ?? fields.minutes,
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** All candidate activities in priority order. Exposed so the UI can offer swaps. */
export function planCandidates(ctx: PlanContext): Candidate[] {
  const out: Candidate[] = [];
  const goals = new Set<GoalId>(ctx.goals.length ? ctx.goals : ['quran-reading', 'daily-habit']);

  // 1. Overdue revision comes first: it is what keeps memorized material.
  if (ctx.dueMemorizationCount > 0) {
    out.push(
      candidate('memorization-review', '*', {
        title: `Revise ${plural(ctx.dueMemorizationCount, 'passage')}`,
        reason: `${plural(ctx.dueMemorizationCount, 'memorized passage')} ${ctx.dueMemorizationCount === 1 ? 'is' : 'are'} due for revision.`,
        minutes: Math.min(ctx.dueMemorizationCount * 2, 12),
        href: '/memorization?view=due',
        flexible: true,
        minMinutes: 2,
      }),
    );
  }
  if (ctx.dueDuaCount > 0) {
    out.push(
      candidate('dua-practice', 'due', {
        title: `Revise ${plural(ctx.dueDuaCount, 'dua')}`,
        reason: `${plural(ctx.dueDuaCount, 'dua')} ${ctx.dueDuaCount === 1 ? 'is' : 'are'} due for revision.`,
        minutes: Math.min(ctx.dueDuaCount, 5),
        href: '/duas?view=due',
        flexible: true,
        minMinutes: 1,
      }),
    );
  }

  // 2. Resume unfinished work.
  if (ctx.inProgressLesson) {
    const l = ctx.inProgressLesson;
    out.push(
      candidate('lesson', l.lessonId, {
        title: `Continue: ${l.title}`,
        reason: `You started this lesson in ${l.courseTitle}.`,
        minutes: l.minutes,
        href: `/lesson/${l.lessonId}`,
      }),
    );
  }

  // 3. Goal-driven activities.
  if (goals.has('quran-reading')) {
    const r = ctx.reading;
    out.push(
      candidate('quran-reading', '*', {
        title: r ? `Continue reading ${r.surahName}` : 'Begin reading the Quran',
        reason: r ? `Pick up from verse ${r.verse}, where you stopped.` : 'Matches your goal of reading the Quran regularly.',
        minutes: 5,
        href: r ? `/quran/${r.surah}?verse=${r.verse}` : '/quran/1',
        flexible: true,
        minMinutes: 3,
      }),
    );
  }

  if (goals.has('quran-memorization') && ctx.dueMemorizationCount === 0 && ctx.activeMemorizationCount < 3) {
    out.push(
      candidate('memorization-new', '*', {
        title: ctx.activeMemorizationCount === 0 ? 'Choose a passage to memorize' : 'Start memorizing a new passage',
        reason: ctx.activeMemorizationCount === 0 ? 'Matches your goal of memorizing Quran.' : 'Nothing is due for revision today.',
        minutes: 6,
        href: '/memorization/new',
        flexible: true,
        minMinutes: 4,
      }),
    );
  }

  const usedLessons = new Set(ctx.inProgressLesson ? [ctx.inProgressLesson.lessonId] : []);
  for (const goal of goals) {
    const categories = GOAL_CATEGORIES[goal];
    if (!categories) continue;
    const lesson = ctx.nextLessons.find((l) => categories.includes(l.category) && !usedLessons.has(l.lessonId));
    if (!lesson) continue;
    usedLessons.add(lesson.lessonId);
    out.push(
      candidate('lesson', lesson.lessonId, {
        title: lesson.title,
        reason: `Next lesson in ${lesson.courseTitle}.`,
        minutes: lesson.minutes,
        href: `/lesson/${lesson.lessonId}`,
      }),
    );
  }

  if (goals.has('duas') && ctx.nextDua && ctx.dueDuaCount === 0) {
    out.push(
      candidate('dua-practice', ctx.nextDua.id, {
        title: `Learn: ${ctx.nextDua.title}`,
        reason: 'Matches your goal of learning duas.',
        minutes: 3,
        href: `/duas/${ctx.nextDua.slug}`,
      }),
    );
  }

  if (goals.has('salah') && ctx.nextSalah) {
    out.push(
      candidate('salah', ctx.nextSalah.slug, {
        title: ctx.nextSalah.title,
        reason: 'Matches your goal of learning Salah.',
        minutes: ctx.nextSalah.minutes,
        href: `/salah/${ctx.nextSalah.slug}`,
      }),
    );
  }

  const s = ctx.nextStory;
  if (s && ((s.collection === 'prophets' && goals.has('prophets-stories')) || (s.collection === 'history' && goals.has('islamic-history')))) {
    out.push(
      candidate('story', s.slug, {
        title: s.title,
        reason: s.collection === 'prophets' ? 'Matches your goal of studying the stories of the Prophets.' : 'Matches your goal of learning Islamic history.',
        minutes: s.minutes,
        href: `/stories/${s.slug}`,
      }),
    );
  }

  if (goals.has('hijri-calendar') && !ctx.calendarVisitedRecently) {
    out.push(
      candidate('calendar', '*', {
        title: 'Check the Hijri calendar',
        reason: 'See the current month and what is coming up.',
        minutes: 2,
        href: '/calendar',
      }),
    );
  }

  // Without goal-specific content, still suggest something useful.
  if (out.length === 0 && ctx.nextLessons[0]) {
    const l = ctx.nextLessons[0];
    out.push(candidate('lesson', l.lessonId, { title: l.title, reason: `Next lesson in ${l.courseTitle}.`, minutes: l.minutes, href: `/lesson/${l.lessonId}` }));
  }
  if (out.length === 0) {
    out.push(
      candidate('quran-reading', '*', {
        title: 'Read from the Quran',
        reason: 'A short reading is a good way to begin.',
        minutes: 5,
        href: '/quran',
        flexible: true,
        minMinutes: 3,
      }),
    );
  }

  return out;
}

const toItem = (c: Candidate, minutes: number): PlanItem => ({
  id: c.id,
  type: c.type,
  ref: c.ref,
  title: c.title,
  reason: c.reason,
  minutes,
  href: c.href,
  status: 'pending',
});

/**
 * Fits prioritized candidates into the time budget. Flexible items shrink to fit; rigid
 * items that do not fit are skipped. If nothing fits, the single smallest item is
 * returned so the learner always has one thing to start with.
 */
export function fitToBudget(candidates: readonly Candidate[], budget: number): PlanItem[] {
  const chosen: PlanItem[] = [];
  let used = 0;
  for (const c of candidates) {
    const remaining = budget - used;
    if (remaining <= 0) break;
    if (c.minutes <= remaining) {
      chosen.push(toItem(c, c.minutes));
      used += c.minutes;
    } else if (c.flexible && c.minMinutes <= remaining) {
      chosen.push(toItem(c, remaining));
      used += remaining;
    }
  }
  if (chosen.length === 0 && candidates.length > 0) {
    const smallest = candidates.reduce((a, b) => ((b.flexible ? b.minMinutes : b.minutes) < (a.flexible ? a.minMinutes : a.minutes) ? b : a));
    chosen.push(toItem(smallest, smallest.flexible ? smallest.minMinutes : smallest.minutes));
  }
  return chosen;
}

export function generateDailyPlan(ctx: PlanContext): DailyPlan {
  return {
    date: ctx.today,
    items: fitToBudget(planCandidates(ctx), ctx.dailyMinutes),
    generatedAt: ctx.now.toISOString(),
    customized: false,
  };
}

/** Suggests a replacement for one item, preferring candidates not already in the plan. */
export function alternativeFor(plan: DailyPlan, itemId: string, ctx: PlanContext): PlanItem | null {
  const inPlan = new Set(plan.items.map((i) => i.id));
  const current = plan.items.find((i) => i.id === itemId);
  if (!current) return null;
  const alt = planCandidates(ctx).find((c) => !inPlan.has(c.id));
  if (!alt) return null;
  return { id: alt.id, type: alt.type, ref: alt.ref, title: alt.title, reason: alt.reason, minutes: alt.minutes, href: alt.href, status: 'pending' };
}

export function planTotals(plan: DailyPlan): { plannedMinutes: number; doneMinutes: number; doneCount: number; activeCount: number } {
  const active = plan.items.filter((i) => i.status !== 'skipped');
  const done = active.filter((i) => i.status === 'done');
  return {
    plannedMinutes: active.reduce((s, i) => s + i.minutes, 0),
    doneMinutes: done.reduce((s, i) => s + i.minutes, 0),
    doneCount: done.length,
    activeCount: active.length,
  };
}
