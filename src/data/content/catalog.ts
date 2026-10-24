// Validates raw content packs and builds an in-memory catalogue. Invalid items are
// excluded and reported (never shown); a test asserts the bundled packs have no issues.
import type { z } from 'zod';
import { isLearnerVisible } from '@/domain/content/schema';
import {
  DuaCategorySchema,
  DuaSchema,
  OccasionSchema,
  SalahGuideSchema,
  SalahPathSchema,
  StoryCollectionSchema,
  StorySchema,
  type Dua,
  type DuaCategory,
  type Occasion,
  type SalahGuide,
  type SalahPath,
  type Story,
  type StoryCollection,
} from '@/domain/content/library';
import { CourseSchema, LessonSchema, type Course, type Lesson } from '@/domain/lessons/schema';

export interface ContentIssue {
  pack: string;
  index: number;
  id: string;
  messages: string[];
}

export interface ContentPacks {
  courses: unknown[];
  lessons: unknown[];
  duaCategories: unknown[];
  duas: unknown[];
  salahPaths: unknown[];
  salahGuides: unknown[];
  storyCollections: unknown[];
  stories: unknown[];
  occasions: unknown[];
}

/** Everything in the catalogue, including drafts. Learner-facing reads go through `ContentRepository`. */
export interface Catalog {
  courses: Course[];
  lessons: Lesson[];
  duaCategories: DuaCategory[];
  duas: Dua[];
  salahPaths: SalahPath[];
  salahGuides: SalahGuide[];
  storyCollections: StoryCollection[];
  stories: Story[];
  occasions: Occasion[];
  issues: ContentIssue[];
}

function parsePack<S extends z.ZodType>(pack: string, schema: S, raw: unknown[], issues: ContentIssue[]): z.infer<S>[] {
  const out: z.infer<S>[] = [];
  raw.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) out.push(result.data);
    else {
      const id = typeof item === 'object' && item && 'id' in item ? String((item as { id: unknown }).id) : (item as { slug?: string })?.slug ?? `#${index}`;
      issues.push({ pack, index, id, messages: result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`) });
    }
  });
  return out;
}

function checkUnique(pack: string, items: { id?: string; slug: string }[], issues: ContentIssue[]) {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const key = item.slug;
    if (seen.has(key)) issues.push({ pack, index, id: item.id ?? key, messages: [`Duplicate slug "${key}"`] });
    seen.add(key);
  });
}

export function buildCatalog(packs: ContentPacks): Catalog {
  const issues: ContentIssue[] = [];
  const catalog: Catalog = {
    courses: parsePack('courses', CourseSchema, packs.courses, issues),
    lessons: parsePack('lessons', LessonSchema, packs.lessons, issues),
    duaCategories: parsePack('duaCategories', DuaCategorySchema, packs.duaCategories, issues),
    duas: parsePack('duas', DuaSchema, packs.duas, issues),
    salahPaths: parsePack('salahPaths', SalahPathSchema, packs.salahPaths, issues),
    salahGuides: parsePack('salahGuides', SalahGuideSchema, packs.salahGuides, issues),
    storyCollections: parsePack('storyCollections', StoryCollectionSchema, packs.storyCollections, issues),
    stories: parsePack('stories', StorySchema, packs.stories, issues),
    occasions: parsePack('occasions', OccasionSchema, packs.occasions, issues),
    issues,
  };
  checkUnique('courses', catalog.courses, issues);
  checkUnique('lessons', catalog.lessons, issues);
  checkUnique('duas', catalog.duas, issues);
  checkUnique('salahGuides', catalog.salahGuides, issues);
  checkUnique('stories', catalog.stories, issues);
  checkUnique('occasions', catalog.occasions, issues);

  // Cross-references: lessons listed by courses must exist; duas must use known categories.
  const lessonIds = new Set(catalog.lessons.map((l) => l.id));
  catalog.courses.forEach((c, index) => {
    const missing = c.modules.flatMap((m) => m.lessonIds).filter((id) => !lessonIds.has(id));
    if (missing.length) issues.push({ pack: 'courses', index, id: c.id, messages: [`Unknown lessons: ${missing.join(', ')}`] });
  });
  const categorySlugs = new Set(catalog.duaCategories.map((c) => c.slug));
  catalog.duas.forEach((d, index) => {
    const unknown = d.categories.filter((c) => !categorySlugs.has(c));
    if (unknown.length) issues.push({ pack: 'duas', index, id: d.id, messages: [`Unknown categories: ${unknown.join(', ')}`] });
  });
  const pathSlugs = new Set(catalog.salahPaths.map((p) => p.slug));
  catalog.salahGuides.forEach((g, index) => {
    if (!pathSlugs.has(g.pathSlug)) issues.push({ pack: 'salahGuides', index, id: g.id, messages: [`Unknown path "${g.pathSlug}"`] });
  });
  const collectionSlugs = new Set(catalog.storyCollections.map((c) => c.slug));
  catalog.stories.forEach((s, index) => {
    if (!collectionSlugs.has(s.collectionSlug)) issues.push({ pack: 'stories', index, id: s.id, messages: [`Unknown collection "${s.collectionSlug}"`] });
  });
  return catalog;
}

export { isLearnerVisible };
