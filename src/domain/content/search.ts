import { normalizeForSearch } from '../quran/text';
import type { Dua, DuaCategory } from './library';

/** Case-, accent- and diacritic-insensitive text for matching. */
export function searchText(...parts: (string | undefined)[]): string {
  return normalizeForSearch(parts.filter(Boolean).join(' '));
}

export function matchesQuery(haystack: string, query: string): boolean {
  const terms = normalizeForSearch(query).split(' ').filter(Boolean);
  return terms.every((t) => haystack.includes(t));
}

export function filterDuas(duas: readonly Dua[], categories: readonly DuaCategory[], opts: { query?: string; category?: string | null }): Dua[] {
  const titleOf = new Map(categories.map((c) => [c.slug, c.title]));
  return duas.filter((d) => {
    if (opts.category && !d.categories.includes(opts.category)) return false;
    if (!opts.query?.trim()) return true;
    const hay = searchText(d.title, d.summary, d.translation, d.transliteration, d.usage, d.arabic, ...d.categories.map((c) => titleOf.get(c)));
    return matchesQuery(hay, opts.query);
  });
}
