// Global search over published content only (inputs come from the content repository,
// which applies the publishing gate).
import type { Dua, DuaCategory, SalahGuide, SalahPath, Story } from '@/domain/content/library';
import { matchesQuery, searchText } from '@/domain/content/search';
import type { ContentClass } from '@/domain/content/schema';
import { HIJRI_MONTHS } from '@/domain/hijri/calendar';
import type { Course, Lesson } from '@/domain/lessons/schema';
import { SURAHS } from '@/domain/quran/metadata';
import { searchSurahs } from '@/domain/quran/search';
import type { OccasionDate } from '@/data/content/repository';

export type ResultType = 'Surah' | 'Course' | 'Lesson' | 'Dua' | 'Dua category' | 'Salah' | 'Story' | 'Chapter' | 'Occasion' | 'Month';

export interface SearchEntry {
  type: ResultType;
  title: string;
  subtitle?: string;
  href: string;
  /** Present for content that carries review metadata. */
  review?: { contentClass: ContentClass; reviewed: boolean };
  haystack: string;
  titleKey: string;
}

export interface SearchSources {
  courses: readonly Course[];
  lessons: readonly Lesson[];
  duas: readonly Dua[];
  duaCategories: readonly DuaCategory[];
  salahPaths: readonly SalahPath[];
  salahGuides: readonly SalahGuide[];
  stories: readonly Story[];
  occasions: readonly OccasionDate[];
}

const reviewOf = (i: { contentClass: ContentClass; review: { reviewer: string | null } }) => ({ contentClass: i.contentClass, reviewed: Boolean(i.review.reviewer) });

function entry(e: Omit<SearchEntry, 'haystack' | 'titleKey'>, ...extra: (string | undefined)[]): SearchEntry {
  return { ...e, haystack: searchText(e.title, e.subtitle, ...extra), titleKey: searchText(e.title) };
}

export function buildSearchIndex(src: SearchSources): SearchEntry[] {
  const courseTitle = new Map(src.courses.map((c) => [c.slug, c.title]));
  return [
    ...src.courses.map((c) => entry({ type: 'Course', title: c.title, subtitle: c.summary, href: `/learn/${c.slug}`, review: reviewOf(c) }, c.category, ...c.objectives)),
    ...src.lessons.map((l) => entry({ type: 'Lesson', title: l.title, subtitle: courseTitle.get(l.courseSlug), href: `/lesson/${l.id}`, review: reviewOf(l) }, l.summary, ...l.objectives)),
    ...src.duas.map((d) => entry({ type: 'Dua', title: d.title, subtitle: d.usage, href: `/duas/${d.slug}`, review: reviewOf(d) }, d.translation, d.transliteration, d.arabic)),
    ...src.duaCategories.map((c) => entry({ type: 'Dua category', title: c.title, subtitle: c.description, href: `/duas?category=${c.slug}` })),
    ...src.salahPaths.map((p) => entry({ type: 'Salah', title: p.title, subtitle: p.summary, href: '/salah' })),
    ...src.salahGuides.map((g) => entry({ type: 'Salah', title: g.title, subtitle: g.summary, href: `/salah/${g.slug}`, review: reviewOf(g) }, ...g.steps.map((s) => s.title))),
    ...src.stories.flatMap((s) => [
      entry({ type: 'Story', title: s.title, subtitle: s.summary, href: `/stories/${s.slug}`, review: reviewOf(s) }),
      ...s.chapters.map((c) => entry({ type: 'Chapter', title: c.title, subtitle: s.title, href: `/stories/${s.slug}?chapter=${c.id}`, review: reviewOf(s) })),
    ]),
    ...src.occasions.map((o) => entry({ type: 'Occasion', title: o.title, subtitle: 'Islamic calendar', href: `/calendar/${o.slug}` })),
    ...HIJRI_MONTHS.map((m, i) => entry({ type: 'Month', title: m, subtitle: `Hijri month ${i + 1}`, href: `/calendar/months/${i + 1}` })),
  ];
}

export function runSearch(index: readonly SearchEntry[], query: string): SearchEntry[] {
  const q = query.trim();
  if (!q) return [];
  const surahHits: SearchEntry[] = searchSurahs(q)
    .slice(0, q.length < 3 ? 5 : 10)
    .map((s) => ({
      type: 'Surah',
      title: `${s.number}. ${s.nameTransliterated}`,
      subtitle: `${s.nameTranslated} · ${s.verseCount} verses`,
      href: `/quran/${s.number}`,
      haystack: '',
      titleKey: '',
    }));
  const normalized = searchText(q);
  const hits = index.filter((e) => matchesQuery(e.haystack, q));
  // Title matches rank before matches elsewhere in the text.
  hits.sort((a, b) => Number(b.titleKey.includes(normalized)) - Number(a.titleKey.includes(normalized)));
  return surahHits.length === SURAHS.length ? hits : [...surahHits, ...hits];
}
