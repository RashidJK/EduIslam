// Learner-facing content access. Every read applies the publishing gate, so draft or
// unreviewed content can never reach ordinary learners through this interface.
import type { Dua, DuaCategory, Occasion, SalahGuide, SalahPath, Story, StoryCollection } from '@/domain/content/library';
import { isLearnerVisible } from '@/domain/content/schema';
import type { HijriRule } from '@/domain/hijri/calendar';
import type { Course, Lesson } from '@/domain/lessons/schema';
import type { Catalog } from './catalog';

/** Calendar placement of an occasion. Always shown (as an estimate), even before its content is reviewed. */
export interface OccasionDate {
  slug: string;
  title: string;
  rule: HijriRule;
  ruleNote?: string;
  hasPublishedContent: boolean;
}

export interface ContentRepository {
  readonly source: string;
  listCourses(): Promise<Course[]>;
  getCourse(slug: string): Promise<Course | null>;
  listLessons(courseSlug?: string): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | null>;
  listDuaCategories(): Promise<DuaCategory[]>;
  listDuas(): Promise<Dua[]>;
  getDua(slug: string): Promise<Dua | null>;
  listSalahPaths(): Promise<SalahPath[]>;
  listSalahGuides(): Promise<SalahGuide[]>;
  getSalahGuide(slug: string): Promise<SalahGuide | null>;
  listStoryCollections(): Promise<StoryCollection[]>;
  listStories(): Promise<Story[]>;
  getStory(slug: string): Promise<Story | null>;
  listOccasionDates(): Promise<OccasionDate[]>;
  /** The occasion's learning content, or null if it is not published. */
  getOccasionContent(slug: string): Promise<Occasion | null>;
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export function createCatalogRepository(catalog: Catalog, source = 'bundled'): ContentRepository {
  const visibleCourses = catalog.courses.filter(isLearnerVisible);
  const visibleCourseSlugs = new Set(visibleCourses.map((c) => c.slug));
  // A lesson is visible only if it and its course are both visible.
  const visibleLessons = catalog.lessons.filter((l) => isLearnerVisible(l) && visibleCourseSlugs.has(l.courseSlug));
  const visibleDuas = catalog.duas.filter(isLearnerVisible);
  const visibleGuides = catalog.salahGuides.filter(isLearnerVisible);
  const visibleStories = catalog.stories.filter(isLearnerVisible);

  const courseOrder = (courseSlug: string) => {
    const course = visibleCourses.find((c) => c.slug === courseSlug);
    return course ? course.modules.flatMap((m) => m.lessonIds) : [];
  };

  return {
    source,
    listCourses: async () => visibleCourses,
    getCourse: async (slug) => visibleCourses.find((c) => c.slug === slug) ?? null,
    listLessons: async (courseSlug) => {
      if (!courseSlug) return visibleLessons;
      const order = courseOrder(courseSlug);
      return visibleLessons.filter((l) => l.courseSlug === courseSlug).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    },
    getLesson: async (id) => visibleLessons.find((l) => l.id === id) ?? null,
    listDuaCategories: async () => [...catalog.duaCategories].sort(byOrder),
    listDuas: async () => visibleDuas,
    getDua: async (slug) => visibleDuas.find((d) => d.slug === slug) ?? null,
    listSalahPaths: async () => [...catalog.salahPaths].sort(byOrder),
    listSalahGuides: async () => visibleGuides,
    getSalahGuide: async (slug) => visibleGuides.find((g) => g.slug === slug) ?? null,
    listStoryCollections: async () => [...catalog.storyCollections].sort(byOrder),
    listStories: async () => visibleStories,
    getStory: async (slug) => visibleStories.find((s) => s.slug === slug) ?? null,
    listOccasionDates: async () =>
      catalog.occasions
        .filter((o) => o.status !== 'archived')
        .map((o) => ({ slug: o.slug, title: o.title, rule: o.rule, ruleNote: o.ruleNote, hasPublishedContent: isLearnerVisible(o) })),
    getOccasionContent: async (slug) => {
      const o = catalog.occasions.find((x) => x.slug === slug);
      return o && isLearnerVisible(o) ? o : null;
    },
  };
}
