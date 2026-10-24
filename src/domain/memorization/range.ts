import { getSurahMeta } from '../quran/metadata';

/** Returns a learner-facing problem with a verse range, or null if it is valid. */
export function validateRange(surah: number, from: number, to: number): string | null {
  const meta = getSurahMeta(surah);
  if (!meta) return 'Choose a surah.';
  if (!Number.isInteger(from) || !Number.isInteger(to)) return 'Enter whole verse numbers.';
  if (from < 1 || to < 1) return 'Verse numbers start at 1.';
  if (from > meta.verseCount || to > meta.verseCount) return `${meta.nameTransliterated} has ${meta.verseCount} verses.`;
  if (from > to) return 'The first verse must come before the last verse.';
  return null;
}
