// The learner's private state. Validated with Zod whenever it is loaded so corrupted or
// tampered storage can never crash the app or silently produce wrong progress.
import { z } from 'zod';
import { GOAL_IDS } from './goals';
import { RATINGS } from '../srs/scheduler';

export const LEARNER_SCHEMA_VERSION = 1;

const DateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const IsoDateTime = z.iso.datetime({ offset: true });

export const DAILY_MINUTE_OPTIONS = [5, 10, 15, 20] as const;
export const HIJRI_METHODS = ['islamic-umalqura', 'islamic-civil', 'islamic-tbla', 'islamic'] as const;

export const SrsStateSchema = z.object({
  intervalDays: z.number().int().min(0),
  ease: z.number().min(1).max(5),
  repetitions: z.number().int().min(0),
  lapses: z.number().int().min(0),
  dueOn: DateKey,
  lastReviewedOn: DateKey.nullable(),
});

export const ReviewEntrySchema = z.object({
  on: DateKey,
  at: IsoDateTime,
  rating: z.enum(RATINGS),
  note: z.string().max(500).optional(),
});

export const ProfileSchema = z.object({
  displayName: z.string().trim().max(60).nullable(),
  onboarding: z.enum(['not-started', 'completed', 'skipped']),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

export const PreferencesSchema = z.object({
  goals: z.array(z.enum(GOAL_IDS)),
  dailyMinutes: z.literal(DAILY_MINUTE_OPTIONS),
  weeklyLessonTarget: z.number().int().min(1).max(50).nullable(),
  quranReadingLevel: z.enum(['beginner', 'can-read', 'confident']).nullable(),
  memorizationStage: z.enum(['not-started', 'memorizing', 'revising']).nullable(),
  reminder: z.object({
    enabled: z.boolean(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  }),
  contentLanguage: z.enum(['en']),
  timeZone: z.string().min(1),
  display: z.object({
    theme: z.enum(['system', 'light', 'dark']),
    arabicScale: z.number().min(0.8).max(2.2),
    showTranslation: z.boolean(),
    showTransliteration: z.boolean(),
    reduceMotion: z.boolean(),
    showConsistency: z.boolean(),
  }),
  hijri: z.object({
    method: z.enum(HIJRI_METHODS),
    dayAdjustment: z.number().int().min(-2).max(2),
  }),
  reciterId: z.string().min(1),
});

export const LessonProgressSchema = z.object({
  lessonId: z.string(),
  courseSlug: z.string(),
  status: z.enum(['in-progress', 'completed']),
  stepIndex: z.number().int().min(0),
  correct: z.number().int().min(0),
  scored: z.number().int().min(0),
  startedAt: IsoDateTime,
  completedAt: IsoDateTime.nullable(),
  updatedAt: IsoDateTime,
  timesCompleted: z.number().int().min(0),
});

export const SurahReadingSchema = z.object({
  lastVerse: z.number().int().min(1),
  furthestVerse: z.number().int().min(1),
  completedOn: DateKey.nullable(),
  updatedAt: IsoDateTime,
});

export const ReadingSchema = z.object({
  current: z.object({ surah: z.number().int().min(1).max(114), verse: z.number().int().min(1), updatedAt: IsoDateTime }).nullable(),
  surahs: z.record(z.string(), SurahReadingSchema),
});

export const BookmarkSchema = z.object({
  id: z.string(),
  kind: z.enum(['verse', 'dua', 'lesson', 'story', 'salah']),
  ref: z.string().min(1),
  label: z.string().max(200),
  note: z.string().max(500).optional(),
  createdAt: IsoDateTime,
});

export const MemorizationItemSchema = z.object({
  id: z.string(),
  surah: z.number().int().min(1).max(114),
  fromVerse: z.number().int().min(1),
  toVerse: z.number().int().min(1),
  startedOn: DateKey,
  lastPracticedOn: DateKey.nullable(),
  srs: SrsStateSchema,
  history: z.array(ReviewEntrySchema),
  notes: z.string().max(1000),
  archived: z.boolean(),
});

export const DuaProgressSchema = z.object({
  duaId: z.string(),
  startedOn: DateKey,
  lastPracticedOn: DateKey.nullable(),
  srs: SrsStateSchema,
  history: z.array(ReviewEntrySchema),
});

export const ActivityTypeSchema = z.enum([
  'quran-reading',
  'listening',
  'memorization-review',
  'memorization-new',
  'dua-practice',
  'lesson',
  'salah',
  'story',
  'calendar',
]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const ActivityRecordSchema = z.object({
  type: ActivityTypeSchema,
  ref: z.string(),
  minutes: z.number().min(0).max(240),
  at: IsoDateTime,
});

export const DailyActivitySchema = z.object({
  minutes: z.number().min(0),
  records: z.array(ActivityRecordSchema),
});

export const PlanItemSchema = z.object({
  id: z.string(),
  type: ActivityTypeSchema,
  ref: z.string(),
  title: z.string(),
  reason: z.string(),
  minutes: z.number().int().min(1).max(60),
  href: z.string(),
  status: z.enum(['pending', 'done', 'skipped']),
});
export type PlanItem = z.infer<typeof PlanItemSchema>;

export const DailyPlanSchema = z.object({
  date: DateKey,
  items: z.array(PlanItemSchema),
  generatedAt: IsoDateTime,
  customized: z.boolean(),
});
export type DailyPlan = z.infer<typeof DailyPlanSchema>;

export const ListeningSchema = z.object({
  favorites: z.array(z.object({ surah: z.number().int().min(1).max(114), reciterId: z.string() })),
  history: z.array(z.object({ surah: z.number().int().min(1).max(114), verse: z.number().int().min(1), reciterId: z.string(), at: IsoDateTime })),
});

export const LearnerStateSchema = z.object({
  schemaVersion: z.literal(LEARNER_SCHEMA_VERSION),
  profile: ProfileSchema,
  preferences: PreferencesSchema,
  lessons: z.record(z.string(), LessonProgressSchema),
  reading: ReadingSchema,
  bookmarks: z.array(BookmarkSchema),
  memorization: z.array(MemorizationItemSchema),
  duas: z.record(z.string(), DuaProgressSchema),
  favorites: z.array(z.object({ kind: z.enum(['dua', 'story', 'course']), ref: z.string() })),
  listening: ListeningSchema,
  activity: z.record(DateKey, DailyActivitySchema),
  plans: z.record(DateKey, DailyPlanSchema),
  storyProgress: z.record(z.string(), z.object({ chapterId: z.string(), completedChapterIds: z.array(z.string()), updatedAt: IsoDateTime })),
  salahProgress: z.record(z.string(), z.object({ stepIndex: z.number().int().min(0), completed: z.boolean(), updatedAt: IsoDateTime })),
});

export type LearnerState = z.infer<typeof LearnerStateSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type LessonProgress = z.infer<typeof LessonProgressSchema>;
export type Bookmark = z.infer<typeof BookmarkSchema>;
export type MemorizationItem = z.infer<typeof MemorizationItemSchema>;
export type DuaProgress = z.infer<typeof DuaProgressSchema>;
export type ReviewEntry = z.infer<typeof ReviewEntrySchema>;
export type ActivityRecord = z.infer<typeof ActivityRecordSchema>;
export type DailyMinutes = Preferences['dailyMinutes'];
export type HijriMethod = Preferences['hijri']['method'];

export const DEFAULT_RECITER_ID = 'ar.alafasy';

export function createInitialLearnerState(now: Date, timeZone: string): LearnerState {
  const at = now.toISOString();
  return {
    schemaVersion: LEARNER_SCHEMA_VERSION,
    profile: { displayName: null, onboarding: 'not-started', createdAt: at, updatedAt: at },
    preferences: {
      goals: [],
      dailyMinutes: 10,
      weeklyLessonTarget: null,
      quranReadingLevel: null,
      memorizationStage: null,
      reminder: { enabled: false, time: '19:00' },
      contentLanguage: 'en',
      timeZone,
      display: {
        theme: 'system',
        arabicScale: 1,
        showTranslation: true,
        showTransliteration: true,
        reduceMotion: false,
        showConsistency: true,
      },
      hijri: { method: 'islamic-umalqura', dayAdjustment: 0 },
      reciterId: DEFAULT_RECITER_ID,
    },
    lessons: {},
    reading: { current: null, surahs: {} },
    bookmarks: [],
    memorization: [],
    duas: {},
    favorites: [],
    listening: { favorites: [], history: [] },
    activity: {},
    plans: {},
    storyProgress: {},
    salahProgress: {},
  };
}
