import { buildCatalog, type ContentPacks } from '../content/catalog';
import { createCatalogRepository, type ContentRepository } from '../content/repository';
import { ContentRowSchema, mergePacks, rowsToPacks, type ContentRow } from './contentRows';

/**
 * Content from the CMS layered over the bundled packs. Remote rows are fetched once; if the
 * backend is unreachable the bundled content is served, so the app keeps working.
 */
export function createRemoteContentRepository(opts: {
  bundled: ContentPacks;
  fetchPublishedRows: () => Promise<unknown[]>;
  onError?: (err: unknown) => void;
}): ContentRepository {
  let repo: Promise<ContentRepository> | null = null;
  const get = () =>
    (repo ??= opts
      .fetchPublishedRows()
      .then((raw) => {
        const rows: ContentRow[] = [];
        for (const r of raw) {
          const parsed = ContentRowSchema.safeParse(r);
          if (parsed.success && parsed.data.status === 'published') rows.push(parsed.data);
        }
        const catalog = buildCatalog(mergePacks(opts.bundled, rowsToPacks(rows)));
        if (catalog.issues.length) console.warn('Some published CMS content failed validation and is hidden.', catalog.issues);
        return createCatalogRepository(catalog, 'cms');
      })
      .catch((err: unknown) => {
        opts.onError?.(err);
        repo = null; // Retry on the next read.
        return createCatalogRepository(buildCatalog(opts.bundled), 'bundled-fallback');
      }));

  const call =
    <K extends keyof ContentRepository>(k: K) =>
    (...args: unknown[]) =>
      get().then((r) => (r[k] as (...a: unknown[]) => unknown)(...args));

  return {
    source: 'cms',
    listCourses: call('listCourses'),
    getCourse: call('getCourse'),
    listLessons: call('listLessons'),
    getLesson: call('getLesson'),
    listDuaCategories: call('listDuaCategories'),
    listDuas: call('listDuas'),
    getDua: call('getDua'),
    listSalahPaths: call('listSalahPaths'),
    listSalahGuides: call('listSalahGuides'),
    getSalahGuide: call('getSalahGuide'),
    listStoryCollections: call('listStoryCollections'),
    listStories: call('listStories'),
    getStory: call('getStory'),
    listOccasionDates: call('listOccasionDates'),
    getOccasionContent: call('getOccasionContent'),
  } as ContentRepository;
}
