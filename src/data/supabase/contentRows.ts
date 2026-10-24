// Maps CMS rows (public.content_items) to the same raw shapes as bundled content packs, so
// remote content is validated by exactly the same schemas and publishing gate.
import { z } from 'zod';
import { CONTENT_CLASSES, PUBLICATION_STATUSES } from '@/domain/content/schema';
import type { ContentPacks } from '../content/catalog';

export const CONTENT_TYPES = ['course', 'lesson', 'dua', 'dua_category', 'salah_path', 'salah_guide', 'story_collection', 'story', 'occasion'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  course: 'Course',
  lesson: 'Lesson',
  dua: 'Dua',
  dua_category: 'Dua category',
  salah_path: 'Salah path',
  salah_guide: 'Salah guide',
  story_collection: 'Story collection',
  story: 'Story',
  occasion: 'Calendar occasion',
};

/** Structural types are not reviewed items; they carry only slug, title and payload fields. */
export const STRUCTURAL_TYPES: readonly ContentType[] = ['dua_category', 'salah_path', 'story_collection'];

export const PACK_FOR_TYPE: Record<ContentType, keyof ContentPacks> = {
  course: 'courses',
  lesson: 'lessons',
  dua: 'duas',
  dua_category: 'duaCategories',
  salah_path: 'salahPaths',
  salah_guide: 'salahGuides',
  story_collection: 'storyCollections',
  story: 'stories',
  occasion: 'occasions',
};

export const ContentRowSchema = z.object({
  id: z.string(),
  content_type: z.enum(CONTENT_TYPES),
  slug: z.string(),
  title: z.string(),
  language: z.string(),
  content_class: z.enum(CONTENT_CLASSES),
  status: z.enum(PUBLICATION_STATUSES),
  payload: z.record(z.string(), z.unknown()),
  version: z.number().int(),
  author_id: z.string().nullable(),
  updated_by: z.string().nullable(),
  reviewer_name: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  review_notes: z.string().nullable(),
  published_at: z.string().nullable(),
  updated_at: z.string(),
});
export type ContentRow = z.infer<typeof ContentRowSchema>;

export function rowToRaw(row: ContentRow): Record<string, unknown> {
  if (STRUCTURAL_TYPES.includes(row.content_type)) return { ...row.payload, slug: row.slug, title: row.title };
  return {
    ...row.payload,
    id: typeof row.payload.id === 'string' ? row.payload.id : row.id,
    slug: row.slug,
    title: row.title,
    language: row.language,
    status: row.status,
    contentClass: row.content_class,
    // Review metadata comes only from the workflow columns, never from editable payload.
    review: {
      reviewer: row.reviewer_name,
      reviewedOn: row.reviewed_at ? row.reviewed_at.slice(0, 10) : null,
      version: row.version,
      ...(row.review_notes ? { notes: row.review_notes } : {}),
    },
  };
}

export function emptyPacks(): ContentPacks {
  return { courses: [], lessons: [], duaCategories: [], duas: [], salahPaths: [], salahGuides: [], storyCollections: [], stories: [], occasions: [] };
}

export function rowsToPacks(rows: readonly ContentRow[]): ContentPacks {
  const packs = emptyPacks();
  for (const row of rows) packs[PACK_FOR_TYPE[row.content_type]].push(rowToRaw(row));
  return packs;
}

const keyOf = (item: unknown) => (item && typeof item === 'object' && 'slug' in item ? String((item as { slug: unknown }).slug) : null);

/** Overlays remote items on bundled ones; a remote item replaces a bundled item with the same slug. */
export function mergePacks(base: ContentPacks, overlay: ContentPacks): ContentPacks {
  const out = emptyPacks();
  for (const key of Object.keys(out) as (keyof ContentPacks)[]) {
    const replaced = new Set(overlay[key].map(keyOf));
    out[key] = [...base[key].filter((i) => !replaced.has(keyOf(i))), ...overlay[key]];
  }
  return out;
}
