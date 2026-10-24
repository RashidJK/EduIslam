// Surah metadata, generated from the provider by scripts/fetch-quran-metadata.mjs and
// validated against canonical totals in tests. Never edit the JSON by hand.
import generated from '@/data/quran/surahs.generated.json';

export interface SurahMeta {
  number: number;
  nameArabic: string;
  nameTransliterated: string;
  nameTranslated: string;
  verseCount: number;
  revelationType: 'Meccan' | 'Medinan';
}

export const SURAH_METADATA_PROVENANCE = generated.provenance;
export const SURAHS: readonly SurahMeta[] = generated.surahs as SurahMeta[];
export const SURAH_COUNT = 114;
export const TOTAL_VERSES = 6236;

const offsets: number[] = [];
SURAHS.reduce((acc, s) => {
  offsets.push(acc);
  return acc + s.verseCount;
}, 0);

export function getSurahMeta(number: number): SurahMeta | undefined {
  return Number.isInteger(number) ? SURAHS[number - 1] : undefined;
}

/** Global (1–6236) verse number for a surah:verse reference. */
export function globalVerseNumber(surah: number, verse: number): number {
  const offset = offsets[surah - 1];
  if (offset === undefined) throw new RangeError(`Unknown surah ${surah}`);
  return offset + verse;
}

export function isValidVerseRef(surah: number, verse: number): boolean {
  const meta = getSurahMeta(surah);
  return Boolean(meta && Number.isInteger(verse) && verse >= 1 && verse <= meta.verseCount);
}

/** Parses "2:255" style references. */
export function parseVerseKey(key: string): { surah: number; verse: number } | null {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(key.trim());
  if (!m) return null;
  const surah = Number(m[1]);
  const verse = Number(m[2]);
  return isValidVerseRef(surah, verse) ? { surah, verse } : null;
}

export function verseKey(surah: number, verse: number): string {
  return `${surah}:${verse}`;
}
