// Lesson content is data, not components: the lesson player renders any lesson that
// validates against these schemas.
import { z } from 'zod';
import { ContentBaseSchema, refinePublishable } from '../content/schema';

const Id = z.string().min(1);

/** Arabic shown inside lessons. Quranic text must reference the Quran provider, never be typed inline. */
export const ArabicSnippetSchema = z.object({
  text: z.string().min(1),
  transliteration: z.string().optional(),
});

const OptionSchema = z.object({
  id: Id,
  label: z.string().min(1),
  /** When present, the option is rendered as Arabic (RTL) text. */
  arabic: z.string().optional(),
});

const QuestionBase = { id: Id, prompt: z.string().min(1), explanation: z.string().min(1) };

export const SingleChoiceSchema = z.object({
  ...QuestionBase,
  type: z.literal('single-choice'),
  promptArabic: z.string().optional(),
  options: z.array(OptionSchema).min(2),
  correctOptionId: Id,
});

export const MultiSelectSchema = z.object({
  ...QuestionBase,
  type: z.literal('multi-select'),
  options: z.array(OptionSchema).min(2),
  correctOptionIds: z.array(Id).min(1),
});

export const MatchPairsSchema = z.object({
  ...QuestionBase,
  type: z.literal('match-pairs'),
  pairs: z
    .array(z.object({ id: Id, left: z.string().min(1), right: z.string().min(1), leftIsArabic: z.boolean().default(false) }))
    .min(2)
    .max(6),
});

export const OrderStepsSchema = z.object({
  ...QuestionBase,
  type: z.literal('order-steps'),
  /** Listed in the correct order; the player shuffles them. */
  items: z.array(z.object({ id: Id, label: z.string().min(1) })).min(2).max(8),
});

export const FillBlankSchema = z.object({
  ...QuestionBase,
  type: z.literal('fill-blank'),
  before: z.string(),
  after: z.string(),
  options: z.array(OptionSchema).min(2),
  correctOptionId: Id,
});

export const ListenSelectSchema = z.object({
  ...QuestionBase,
  type: z.literal('listen-select'),
  audio: z.object({ url: z.url(), credit: z.string().min(1) }),
  options: z.array(OptionSchema).min(2),
  correctOptionId: Id,
});

export const ReflectionSchema = z.object({
  id: Id,
  type: z.literal('reflection'),
  prompt: z.string().min(1),
  guidance: z.string().optional(),
});

export const RecallSchema = z.object({
  id: Id,
  type: z.literal('recall'),
  prompt: z.string().min(1),
  answer: z.string().min(1),
  answerIsArabic: z.boolean().default(false),
});

export const QuestionSchema = z.discriminatedUnion('type', [
  SingleChoiceSchema,
  MultiSelectSchema,
  MatchPairsSchema,
  OrderStepsSchema,
  FillBlankSchema,
  ListenSelectSchema,
  ReflectionSchema,
  RecallSchema,
]);
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionType = Question['type'];

export const LessonStepSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('intro'), title: z.string(), body: z.string(), objective: z.string() }),
  z.object({ kind: z.literal('concept'), title: z.string(), body: z.string(), arabic: z.array(ArabicSnippetSchema).optional() }),
  z.object({ kind: z.literal('read'), title: z.string(), body: z.string() }),
  z.object({ kind: z.literal('question'), question: QuestionSchema }),
  z.object({ kind: z.literal('summary'), title: z.string(), points: z.array(z.string()).min(1) }),
]);
export type LessonStep = z.infer<typeof LessonStepSchema>;

export const LessonSchema = ContentBaseSchema.extend({
  courseSlug: z.string(),
  moduleId: z.string(),
  objectives: z.array(z.string()).min(1),
  estimatedMinutes: z.number().int().min(1).max(60),
  steps: z.array(LessonStepSchema).min(1),
})
  .superRefine(refinePublishable)
  .superRefine((lesson, ctx) => {
    lesson.steps.forEach((step, i) => {
      if (step.kind !== 'question') return;
      const q = step.question;
      const ids = 'options' in q ? q.options.map((o) => o.id) : [];
      const check = (id: string) => {
        if (!ids.includes(id)) ctx.addIssue({ code: 'custom', path: ['steps', i], message: `Answer "${id}" is not one of the options` });
      };
      if (q.type === 'single-choice' || q.type === 'fill-blank' || q.type === 'listen-select') check(q.correctOptionId);
      if (q.type === 'multi-select') q.correctOptionIds.forEach(check);
    });
  });
export type Lesson = z.infer<typeof LessonSchema>;

export const COURSE_CATEGORIES = [
  'getting-started',
  'arabic-reading',
  'quran-meaning',
  'salah',
  'foundations',
  'pillars-of-islam',
  'pillars-of-iman',
  'hadith',
  'character',
  'fiqh',
  'vocabulary',
  'scholars',
] as const;
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export const CourseSchema = ContentBaseSchema.extend({
  category: z.enum(COURSE_CATEGORIES),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  objectives: z.array(z.string()),
  estimatedMinutes: z.number().int().min(0),
  prerequisites: z.array(z.string()),
  /** Which learning area the course belongs to in navigation. */
  area: z.enum(['learn', 'knowledge', 'salah']),
  modules: z.array(z.object({ id: Id, title: z.string(), lessonIds: z.array(Id) })),
}).superRefine(refinePublishable);
export type Course = z.infer<typeof CourseSchema>;
