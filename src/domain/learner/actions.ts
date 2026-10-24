// Pure state transitions for learner data. UI code calls these through the learner store,
// which persists the result. Keeping them pure makes every rule unit-testable.
import { simpleScheduler, type Rating, isDue } from '../srs/scheduler';
import { diffDays, toLocalDateKey, type LocalDateKey } from '../time';
import type { GoalId } from './goals';
import type {
  ActivityType,
  Bookmark,
  DailyPlan,
  LearnerState,
  MemorizationItem,
  PlanItem,
  Preferences,
} from './schema';

export function todayKey(state: LearnerState, now: Date): LocalDateKey {
  return toLocalDateKey(now, state.preferences.timeZone);
}

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

function touchProfile(state: LearnerState, now: Date): LearnerState {
  return { ...state, profile: { ...state.profile, updatedAt: now.toISOString() } };
}

// ---------------------------------------------------------------- onboarding & preferences

export interface OnboardingInput {
  goals: GoalId[];
  dailyMinutes: Preferences['dailyMinutes'];
  quranReadingLevel: Preferences['quranReadingLevel'];
  memorizationStage: Preferences['memorizationStage'];
  reminder: Preferences['reminder'];
  displayName?: string | null;
}

export function completeOnboarding(state: LearnerState, input: OnboardingInput, now: Date): LearnerState {
  const goals = [...new Set(input.goals)];
  const today = todayKey(state, now);
  // Preferences changed, so today's suggested plan should be rebuilt.
  const { [today]: _stale, ...plans } = state.plans;
  return {
    ...state,
    plans,
    profile: {
      ...state.profile,
      displayName: input.displayName?.trim() || state.profile.displayName,
      onboarding: 'completed',
      updatedAt: now.toISOString(),
    },
    preferences: {
      ...state.preferences,
      goals,
      dailyMinutes: input.dailyMinutes,
      quranReadingLevel: input.quranReadingLevel,
      memorizationStage: input.memorizationStage,
      reminder: input.reminder,
    },
  };
}

export function skipOnboarding(state: LearnerState, now: Date): LearnerState {
  if (state.profile.onboarding === 'completed') return state;
  return { ...state, profile: { ...state.profile, onboarding: 'skipped', updatedAt: now.toISOString() } };
}

export type PreferencesPatch = Partial<Omit<Preferences, 'display' | 'hijri' | 'reminder'>> & {
  display?: Partial<Preferences['display']>;
  hijri?: Partial<Preferences['hijri']>;
  reminder?: Partial<Preferences['reminder']>;
};

export function updatePreferences(state: LearnerState, patch: PreferencesPatch, now: Date): LearnerState {
  const p = state.preferences;
  const next: Preferences = {
    ...p,
    ...patch,
    display: { ...p.display, ...patch.display },
    hijri: { ...p.hijri, ...patch.hijri },
    reminder: { ...p.reminder, ...patch.reminder },
  };
  const planAffecting = patch.goals !== undefined || patch.dailyMinutes !== undefined;
  const today = todayKey(state, now);
  const plans = { ...state.plans };
  // Rebuild today's plan when its inputs change, unless the learner already customized it.
  if (planAffecting && plans[today] && !plans[today].customized) delete plans[today];
  return touchProfile({ ...state, preferences: next, plans }, now);
}

export function setDisplayName(state: LearnerState, name: string | null, now: Date): LearnerState {
  const trimmed = name?.trim() ?? '';
  return { ...state, profile: { ...state.profile, displayName: trimmed || null, updatedAt: now.toISOString() } };
}

// ---------------------------------------------------------------- activity & plan

export interface ActivityInput {
  type: ActivityType;
  ref: string;
  minutes: number;
}

function planItemMatches(item: PlanItem, type: ActivityType, ref: string): boolean {
  return item.type === type && (item.ref === '*' || item.ref === ref);
}

/** Records an activity for the learner's local day and ticks off matching plan items. */
export function recordActivity(state: LearnerState, input: ActivityInput, now: Date): LearnerState {
  const today = todayKey(state, now);
  const day = state.activity[today] ?? { minutes: 0, records: [] };
  const minutes = Math.max(0, Math.min(240, Math.round(input.minutes * 10) / 10));
  const activity = {
    ...state.activity,
    [today]: { minutes: day.minutes + minutes, records: [...day.records, { ...input, minutes, at: now.toISOString() }] },
  };
  const plan = state.plans[today];
  const plans = plan ? { ...state.plans, [today]: markPlanDone(plan, input.type, input.ref) } : state.plans;
  return { ...state, activity, plans };
}

export function markPlanDone(plan: DailyPlan, type: ActivityType, ref: string): DailyPlan {
  let changed = false;
  const items = plan.items.map((item) => {
    if (item.status === 'pending' && planItemMatches(item, type, ref)) {
      changed = true;
      return { ...item, status: 'done' as const };
    }
    return item;
  });
  return changed ? { ...plan, items } : plan;
}

const PLAN_RETENTION_DAYS = 30;

/** Stores a day's plan. Plans older than 30 days are dropped; activity history is kept. */
export function setPlan(state: LearnerState, plan: DailyPlan): LearnerState {
  const plans: LearnerState['plans'] = {};
  for (const [date, p] of Object.entries(state.plans)) {
    if (diffDays(date, plan.date) <= PLAN_RETENTION_DAYS) plans[date] = p;
  }
  plans[plan.date] = plan;
  return { ...state, plans };
}

export type PlanEdit =
  | { kind: 'skip'; itemId: string }
  | { kind: 'restore'; itemId: string }
  | { kind: 'remove'; itemId: string }
  | { kind: 'move'; itemId: string; direction: -1 | 1 }
  | { kind: 'replace'; itemId: string; replacement: PlanItem }
  | { kind: 'add'; item: PlanItem };

export function editPlan(plan: DailyPlan, edit: PlanEdit): DailyPlan {
  const items = [...plan.items];
  const index = 'itemId' in edit ? items.findIndex((i) => i.id === edit.itemId) : -1;
  if ('itemId' in edit && index === -1) return plan;
  switch (edit.kind) {
    case 'skip':
      items[index] = { ...items[index]!, status: 'skipped' };
      break;
    case 'restore':
      items[index] = { ...items[index]!, status: 'pending' };
      break;
    case 'remove':
      items.splice(index, 1);
      break;
    case 'move': {
      const target = index + edit.direction;
      if (target < 0 || target >= items.length) return plan;
      [items[index], items[target]] = [items[target]!, items[index]!];
      break;
    }
    case 'replace':
      items[index] = edit.replacement;
      break;
    case 'add':
      if (items.some((i) => i.id === edit.item.id)) return plan;
      items.push(edit.item);
      break;
  }
  return { ...plan, items, customized: true };
}

// ---------------------------------------------------------------- lessons

export function startLesson(state: LearnerState, input: { lessonId: string; courseSlug: string }, now: Date): LearnerState {
  const existing = state.lessons[input.lessonId];
  const at = now.toISOString();
  // Re-opening a completed lesson keeps its completion; it starts a fresh pass at step 0.
  const progress = existing
    ? { ...existing, stepIndex: 0, correct: 0, scored: 0, updatedAt: at, status: existing.status }
    : {
        lessonId: input.lessonId,
        courseSlug: input.courseSlug,
        status: 'in-progress' as const,
        stepIndex: 0,
        correct: 0,
        scored: 0,
        startedAt: at,
        completedAt: null,
        updatedAt: at,
        timesCompleted: 0,
      };
  return { ...state, lessons: { ...state.lessons, [input.lessonId]: progress } };
}

export function saveLessonStep(
  state: LearnerState,
  input: { lessonId: string; stepIndex: number; correct: number; scored: number },
  now: Date,
): LearnerState {
  const existing = state.lessons[input.lessonId];
  if (!existing) return state;
  return {
    ...state,
    lessons: {
      ...state.lessons,
      [input.lessonId]: { ...existing, stepIndex: input.stepIndex, correct: input.correct, scored: input.scored, updatedAt: now.toISOString() },
    },
  };
}

export function completeLesson(
  state: LearnerState,
  input: { lessonId: string; courseSlug: string; correct: number; scored: number; minutes: number },
  now: Date,
): LearnerState {
  const at = now.toISOString();
  const existing = state.lessons[input.lessonId];
  const progress = {
    lessonId: input.lessonId,
    courseSlug: input.courseSlug,
    status: 'completed' as const,
    stepIndex: 0,
    correct: input.correct,
    scored: input.scored,
    startedAt: existing?.startedAt ?? at,
    completedAt: at,
    updatedAt: at,
    timesCompleted: (existing?.timesCompleted ?? 0) + 1,
  };
  const next = { ...state, lessons: { ...state.lessons, [input.lessonId]: progress } };
  return recordActivity(next, { type: 'lesson', ref: input.lessonId, minutes: input.minutes }, now);
}

// ---------------------------------------------------------------- Quran reading & bookmarks

export function saveReadingPosition(
  state: LearnerState,
  input: { surah: number; verse: number; verseCount: number },
  now: Date,
): LearnerState {
  const at = now.toISOString();
  const key = String(input.surah);
  const prev = state.reading.surahs[key];
  const furthest = Math.max(prev?.furthestVerse ?? 0, input.verse);
  const completedOn = prev?.completedOn ?? (furthest >= input.verseCount ? todayKey(state, now) : null);
  return {
    ...state,
    reading: {
      current: { surah: input.surah, verse: input.verse, updatedAt: at },
      surahs: { ...state.reading.surahs, [key]: { lastVerse: input.verse, furthestVerse: furthest, completedOn, updatedAt: at } },
    },
  };
}

export function addBookmark(state: LearnerState, input: Omit<Bookmark, 'id' | 'createdAt'>, now: Date): LearnerState {
  if (state.bookmarks.some((b) => b.kind === input.kind && b.ref === input.ref)) return state;
  return { ...state, bookmarks: [{ ...input, id: newId(), createdAt: now.toISOString() }, ...state.bookmarks] };
}

export function removeBookmark(state: LearnerState, input: { kind: Bookmark['kind']; ref: string }): LearnerState {
  return { ...state, bookmarks: state.bookmarks.filter((b) => !(b.kind === input.kind && b.ref === input.ref)) };
}

export function toggleFavorite(state: LearnerState, input: LearnerState['favorites'][number]): LearnerState {
  const exists = state.favorites.some((f) => f.kind === input.kind && f.ref === input.ref);
  return {
    ...state,
    favorites: exists ? state.favorites.filter((f) => !(f.kind === input.kind && f.ref === input.ref)) : [...state.favorites, input],
  };
}

// ---------------------------------------------------------------- memorization

export const MINUTES_PER_PASSAGE_REVIEW = 2;

export function startMemorization(
  state: LearnerState,
  input: { surah: number; fromVerse: number; toVerse: number; notes?: string },
  now: Date,
): { state: LearnerState; item: MemorizationItem } {
  if (input.fromVerse > input.toVerse) throw new Error('Start verse must not be after end verse');
  const duplicate = state.memorization.find(
    (m) => !m.archived && m.surah === input.surah && m.fromVerse === input.fromVerse && m.toVerse === input.toVerse,
  );
  if (duplicate) return { state, item: duplicate };
  const today = todayKey(state, now);
  const item: MemorizationItem = {
    id: newId(),
    surah: input.surah,
    fromVerse: input.fromVerse,
    toVerse: input.toVerse,
    startedOn: today,
    lastPracticedOn: null,
    srs: simpleScheduler.initial(today),
    history: [],
    notes: input.notes ?? '',
    archived: false,
  };
  return { state: { ...state, memorization: [...state.memorization, item] }, item };
}

export function dueMemorization(state: LearnerState, today: LocalDateKey): MemorizationItem[] {
  return state.memorization
    .filter((m) => !m.archived && isDue(m.srs, today))
    .sort((a, b) => a.srs.dueOn.localeCompare(b.srs.dueOn));
}

export function reviewMemorization(
  state: LearnerState,
  input: { itemId: string; rating: Rating; note?: string },
  now: Date,
): { state: LearnerState; explanation: string } {
  const item = state.memorization.find((m) => m.id === input.itemId);
  if (!item) throw new Error('Memorization item not found');
  const today = todayKey(state, now);
  const { state: srs, explanation } = simpleScheduler.review(item.srs, input.rating, today);
  const updated: MemorizationItem = {
    ...item,
    srs,
    lastPracticedOn: today,
    history: [...item.history, { on: today, at: now.toISOString(), rating: input.rating, ...(input.note ? { note: input.note } : {}) }],
  };
  const isFirst = item.history.length === 0;
  let next: LearnerState = { ...state, memorization: state.memorization.map((m) => (m.id === item.id ? updated : m)) };
  next = recordActivity(next, { type: isFirst ? 'memorization-new' : 'memorization-review', ref: item.id, minutes: MINUTES_PER_PASSAGE_REVIEW }, now);
  // The "revise due passages" plan item is only done once nothing is left due today.
  const plan = next.plans[today];
  if (plan && dueMemorization(next, today).length === 0) {
    next = { ...next, plans: { ...next.plans, [today]: markPlanDone(plan, 'memorization-review', '*') } };
  }
  return { state: next, explanation };
}

export function updateMemorizationItem(
  state: LearnerState,
  input: { itemId: string; notes?: string; archived?: boolean },
): LearnerState {
  return {
    ...state,
    memorization: state.memorization.map((m) =>
      m.id === input.itemId ? { ...m, ...(input.notes !== undefined && { notes: input.notes }), ...(input.archived !== undefined && { archived: input.archived }) } : m,
    ),
  };
}

export function deleteMemorizationItem(state: LearnerState, itemId: string): LearnerState {
  return { ...state, memorization: state.memorization.filter((m) => m.id !== itemId) };
}

// ---------------------------------------------------------------- duas

export function reviewDua(
  state: LearnerState,
  input: { duaId: string; rating: Rating },
  now: Date,
): { state: LearnerState; explanation: string } {
  const today = todayKey(state, now);
  const existing = state.duas[input.duaId] ?? {
    duaId: input.duaId,
    startedOn: today,
    lastPracticedOn: null,
    srs: simpleScheduler.initial(today),
    history: [],
  };
  const { state: srs, explanation } = simpleScheduler.review(existing.srs, input.rating, today);
  const updated = {
    ...existing,
    srs,
    lastPracticedOn: today,
    history: [...existing.history, { on: today, at: now.toISOString(), rating: input.rating }],
  };
  let next = recordActivity({ ...state, duas: { ...state.duas, [input.duaId]: updated } }, { type: 'dua-practice', ref: input.duaId, minutes: 1 }, now);
  // The "revise due duas" plan item is only done once nothing is left due today.
  const plan = next.plans[today];
  if (plan && dueDuas(next, today).length === 0) {
    next = { ...next, plans: { ...next.plans, [today]: markPlanDone(plan, 'dua-practice', 'due') } };
  }
  return { state: next, explanation };
}

export function dueDuas(state: LearnerState, today: LocalDateKey) {
  return Object.values(state.duas)
    .filter((d) => isDue(d.srs, today))
    .sort((a, b) => a.srs.dueOn.localeCompare(b.srs.dueOn));
}

// ---------------------------------------------------------------- listening, stories, salah

const LISTENING_HISTORY_LIMIT = 50;

export function recordListening(state: LearnerState, input: { surah: number; verse: number; reciterId: string }, now: Date): LearnerState {
  const history = [
    { ...input, at: now.toISOString() },
    ...state.listening.history.filter((h) => !(h.surah === input.surah && h.reciterId === input.reciterId)),
  ].slice(0, LISTENING_HISTORY_LIMIT);
  return { ...state, listening: { ...state.listening, history } };
}

export function toggleListeningFavorite(state: LearnerState, input: { surah: number; reciterId: string }): LearnerState {
  const favs = state.listening.favorites;
  const exists = favs.some((f) => f.surah === input.surah && f.reciterId === input.reciterId);
  return {
    ...state,
    listening: {
      ...state.listening,
      favorites: exists ? favs.filter((f) => !(f.surah === input.surah && f.reciterId === input.reciterId)) : [...favs, input],
    },
  };
}

export function saveStoryProgress(
  state: LearnerState,
  input: { storySlug: string; chapterId: string; completedChapterId?: string },
  now: Date,
): LearnerState {
  const prev = state.storyProgress[input.storySlug];
  const completed = new Set(prev?.completedChapterIds ?? []);
  if (input.completedChapterId) completed.add(input.completedChapterId);
  return {
    ...state,
    storyProgress: {
      ...state.storyProgress,
      [input.storySlug]: { chapterId: input.chapterId, completedChapterIds: [...completed], updatedAt: now.toISOString() },
    },
  };
}

export function saveSalahProgress(
  state: LearnerState,
  input: { guideSlug: string; stepIndex: number; completed?: boolean },
  now: Date,
): LearnerState {
  const prev = state.salahProgress[input.guideSlug];
  return {
    ...state,
    salahProgress: {
      ...state.salahProgress,
      [input.guideSlug]: { stepIndex: input.stepIndex, completed: input.completed ?? prev?.completed ?? false, updatedAt: now.toISOString() },
    },
  };
}
