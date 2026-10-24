import { rawCourses, rawLessons } from '@/content/courses';
import {
  rawDuaCategories,
  rawDuas,
  rawOccasions,
  rawSalahGuides,
  rawSalahPaths,
  rawStories,
  rawStoryCollections,
} from '@/content/library';
import { buildCatalog, type ContentPacks } from './catalog';
import { createCatalogRepository } from './repository';

export const bundledPacks: ContentPacks = {
  courses: rawCourses,
  lessons: rawLessons,
  duaCategories: rawDuaCategories,
  duas: rawDuas,
  salahPaths: rawSalahPaths,
  salahGuides: rawSalahGuides,
  storyCollections: rawStoryCollections,
  stories: rawStories,
  occasions: rawOccasions,
};

export const bundledCatalog = buildCatalog(bundledPacks);

if (bundledCatalog.issues.length && import.meta.env.DEV) {
  console.warn('Bundled content has issues; affected items are hidden.', bundledCatalog.issues);
}

export const bundledContent = createCatalogRepository(bundledCatalog);
