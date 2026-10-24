// Validation for CMS drafts, using exactly the schemas that gate learner-facing content.
import type { z } from 'zod';
import { DuaCategorySchema, DuaSchema, OccasionSchema, SalahGuideSchema, SalahPathSchema, StoryCollectionSchema, StorySchema } from '@/domain/content/library';
import { publishingProblems, type ContentClass } from '@/domain/content/schema';
import { CourseSchema, LessonSchema } from '@/domain/lessons/schema';
import { rowToRaw, STRUCTURAL_TYPES, type ContentRow, type ContentType } from '@/data/supabase/contentRows';

export const SCHEMA_FOR_TYPE: Record<ContentType, z.ZodType> = {
  course: CourseSchema,
  lesson: LessonSchema,
  dua: DuaSchema,
  dua_category: DuaCategorySchema,
  salah_path: SalahPathSchema,
  salah_guide: SalahGuideSchema,
  story_collection: StoryCollectionSchema,
  story: StorySchema,
  occasion: OccasionSchema,
};

export interface DraftCheck {
  structure: string[];
  beforePublishing: string[];
  parsed: unknown | null;
}

/** Checks a draft as it would be published, so editors see every remaining problem now. */
export function checkDraft(row: Pick<ContentRow, 'content_type' | 'slug' | 'title' | 'language' | 'content_class' | 'payload' | 'version' | 'id'>): DraftCheck {
  const asPublished = rowToRaw({
    ...row,
    status: 'published',
    author_id: null,
    updated_by: null,
    reviewer_name: 'Pending reviewer',
    reviewed_at: new Date().toISOString(),
    review_notes: null,
    published_at: null,
    updated_at: new Date().toISOString(),
  });
  const result = SCHEMA_FOR_TYPE[row.content_type].safeParse(asPublished);
  // Publishing-gate messages are listed separately under "before publishing".
  const structure = result.success
    ? []
    : result.error.issues.filter((i) => !i.message.startsWith('Cannot publish')).map((i) => `${i.path.join('.') || 'item'}: ${i.message}`);
  const beforePublishing: string[] = [];
  if (!STRUCTURAL_TYPES.includes(row.content_type)) {
    const sources = Array.isArray(row.payload.sources) ? (row.payload.sources as never[]) : [];
    for (const p of publishingProblems({
      contentClass: row.content_class as ContentClass,
      sources,
      review: { reviewer: 'pending', reviewedOn: '2000-01-01', version: row.version },
      notice: typeof row.payload.notice === 'string' ? row.payload.notice : undefined,
    })) {
      beforePublishing.push(p.message);
    }
    if (row.content_class === 'religious') beforePublishing.push('A reviewer other than the author must approve this exact version.');
  }
  return { structure, beforePublishing, parsed: result.success ? result.data : null };
}
