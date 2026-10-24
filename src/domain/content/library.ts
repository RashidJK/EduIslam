// Schemas for duas, Salah guides, stories, and calendar occasions. All of them are
// `religious` content: they cannot be published without sources and a named reviewer.
import { z } from 'zod';
import { ContentBaseSchema, refinePublishable } from './schema';
import { QuestionSchema } from '../lessons/schema';

const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function requireReligious(item: { contentClass: string; id: string }, ctx: z.RefinementCtx) {
  if (item.contentClass !== 'religious') {
    ctx.addIssue({ code: 'custom', path: ['contentClass'], message: `"${item.id}" must be classed as religious content` });
  }
}

function requireKnownSources(item: { sources: { id: string }[]; id: string }, ids: string[], path: (string | number)[], ctx: z.RefinementCtx) {
  const known = new Set(item.sources.map((s) => s.id));
  for (const id of ids) {
    if (!known.has(id)) ctx.addIssue({ code: 'custom', path, message: `"${item.id}" cites unknown source "${id}"` });
  }
}

const AudioRefSchema = z.object({
  url: z.url(),
  credit: z.string().min(1),
  license: z.string().min(1),
});

// ---------------------------------------------------------------- duas

export const DuaCategorySchema = z.object({
  slug: Slug,
  title: z.string().min(1),
  description: z.string(),
  order: z.number().int(),
});
export type DuaCategory = z.infer<typeof DuaCategorySchema>;

export const DuaSchema = ContentBaseSchema.extend({
  /** Verbatim Arabic from the cited source. Never paraphrased or generated. */
  arabic: z.string().min(1),
  transliteration: z.string().optional(),
  translation: z.string().min(1),
  /** When the dua is used. Explanatory, kept separate from the source text. */
  usage: z.string().min(1),
  explanatoryNotes: z.string().optional(),
  /**
   * Reviewed phrase-by-phrase meanings. The "match phrase to meaning" exercise is only
   * offered when these are provided — it is never derived automatically.
   */
  phrases: z.array(z.object({ arabic: z.string().min(1), meaning: z.string().min(1) })).min(2).max(6).optional(),
  categories: z.array(Slug).min(1),
  audio: AudioRefSchema.optional(),
  /** Grading with attribution, tied to one of the item's sources. */
  authenticity: z.object({ grade: z.string().min(1), gradedBy: z.string().min(1), sourceId: z.string().min(1) }).optional(),
})
  .superRefine(requireReligious)
  .superRefine(refinePublishable)
  .superRefine((d, ctx) => {
    if (d.authenticity) requireKnownSources(d, [d.authenticity.sourceId], ['authenticity', 'sourceId'], ctx);
  });
export type Dua = z.infer<typeof DuaSchema>;

// ---------------------------------------------------------------- Salah

export const SalahPathSchema = z.object({
  slug: Slug,
  title: z.string().min(1),
  summary: z.string(),
  order: z.number().int(),
});
export type SalahPath = z.infer<typeof SalahPathSchema>;

export const RecitationSchema = z.object({
  arabic: z.string().min(1),
  transliteration: z.string().optional(),
  translation: z.string().min(1),
  sourceId: z.string().min(1),
  audio: AudioRefSchema.optional(),
});

export const SalahStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  explanation: z.string().min(1),
  whyItMatters: z.string().optional(),
  recitation: RecitationSchema.optional(),
  illustration: z.object({ src: z.string().min(1), alt: z.string().min(1) }).optional(),
});

export const SalahGuideSchema = ContentBaseSchema.extend({
  pathSlug: Slug,
  practiceType: z.enum(['obligatory', 'sunnah', 'voluntary', 'general']),
  /** Which school(s) of jurisprudence the guide follows, and where others differ. */
  schoolNote: z.string().optional(),
  estimatedMinutes: z.number().int().min(1),
  steps: z.array(SalahStepSchema).min(1),
})
  .superRefine(requireReligious)
  .superRefine(refinePublishable)
  .superRefine((g, ctx) => {
    g.steps.forEach((s, i) => {
      if (s.recitation) requireKnownSources(g, [s.recitation.sourceId], ['steps', i, 'recitation'], ctx);
    });
  });
export type SalahGuide = z.infer<typeof SalahGuideSchema>;

// ---------------------------------------------------------------- stories

export const StoryCollectionSchema = z.object({
  slug: Slug,
  title: z.string().min(1),
  summary: z.string(),
  order: z.number().int(),
  kind: z.enum(['prophets', 'history']),
});
export type StoryCollection = z.infer<typeof StoryCollectionSchema>;

/**
 * Every passage states what kind of claim it is, so learners can tell Quranic statements,
 * hadith, later historical accounts, and commentary apart.
 */
export const StorySectionSchema = z.object({
  kind: z.enum(['quran', 'hadith', 'historical', 'commentary']),
  text: z.string().min(1),
  sourceIds: z.array(z.string()).min(1),
  /** For `quran` sections: verse references; the text is read from the Quran provider. */
  quranRefs: z.array(z.string().regex(/^\d{1,3}:\d{1,3}(-\d{1,3})?$/)).optional(),
  /** Where accounts differ, say so. */
  differenceNote: z.string().optional(),
});

export const StoryChapterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  estimatedMinutes: z.number().int().min(1),
  sections: z.array(StorySectionSchema).min(1),
  keyLessons: z.array(z.string()),
  check: z.array(QuestionSchema).optional(),
});
export type StoryChapter = z.infer<typeof StoryChapterSchema>;

export const StorySchema = ContentBaseSchema.extend({
  collectionSlug: Slug,
  chapters: z.array(StoryChapterSchema).min(1),
})
  .superRefine(requireReligious)
  .superRefine(refinePublishable)
  .superRefine((s, ctx) => {
    s.chapters.forEach((c, ci) =>
      c.sections.forEach((sec, si) => requireKnownSources(s, sec.sourceIds, ['chapters', ci, 'sections', si], ctx)),
    );
  });
export type Story = z.infer<typeof StorySchema>;

// ---------------------------------------------------------------- calendar occasions

export const HijriRuleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('day'), month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(30) }),
  z.object({
    kind: z.literal('range'),
    month: z.number().int().min(1).max(12),
    fromDay: z.number().int().min(1).max(30),
    toDay: z.number().int().min(1).max(30),
  }),
  z.object({ kind: z.literal('month'), month: z.number().int().min(1).max(12) }),
  z.object({ kind: z.literal('last-nights'), month: z.number().int().min(1).max(12), nights: z.number().int().min(1).max(15) }),
]);

/**
 * An occasion has two parts: its calendar placement (title + date rule), which the calendar
 * always shows as an estimate, and its learning content, which follows the publishing gate.
 */
export const OccasionSchema = ContentBaseSchema.extend({
  rule: HijriRuleSchema,
  ruleNote: z.string().optional(),
  sections: z.array(StorySectionSchema),
  relatedDuaSlugs: z.array(Slug),
  relatedLessonIds: z.array(z.string()),
})
  .superRefine(requireReligious)
  .superRefine(refinePublishable)
  .superRefine((o, ctx) => {
    if (o.status === 'published' && o.sections.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['sections'], message: `"${o.id}" cannot be published without content` });
    }
    o.sections.forEach((sec, i) => requireKnownSources(o, sec.sourceIds, ['sections', i], ctx));
  });
export type Occasion = z.infer<typeof OccasionSchema>;
