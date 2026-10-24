// Integrity checks applied to every surah received from a provider before it can be shown.
// If anything does not line up with the canonical metadata, the text is not rendered.
import { getSurahMeta, globalVerseNumber } from './metadata';

export interface RawVerse {
  numberInSurah: number;
  globalNumber: number;
  text: string;
}

export function verifySurahVerses(surah: number, editions: { label: string; verses: readonly RawVerse[] }[]): string[] {
  const meta = getSurahMeta(surah);
  if (!meta) return [`Unknown surah ${surah}`];
  const problems: string[] = [];
  for (const { label, verses } of editions) {
    if (verses.length !== meta.verseCount) {
      problems.push(`${label}: expected ${meta.verseCount} verses, received ${verses.length}`);
      continue;
    }
    verses.forEach((v, i) => {
      if (v.numberInSurah !== i + 1) problems.push(`${label}: verse at position ${i + 1} is numbered ${v.numberInSurah}`);
      const expectedGlobal = globalVerseNumber(surah, i + 1);
      if (v.globalNumber !== expectedGlobal) problems.push(`${label}: verse ${i + 1} has global number ${v.globalNumber}, expected ${expectedGlobal}`);
      if (!v.text || !v.text.trim()) problems.push(`${label}: verse ${i + 1} is empty`);
    });
  }
  return problems;
}
