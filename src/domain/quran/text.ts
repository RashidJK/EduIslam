// Text handling for provider-supplied Quran text. The rules here are deliberately narrow
// and documented in docs/SOURCES.md:
//  1. Remove a leading byte-order mark (U+FEFF) — an encoding artifact, not part of the text.
//  2. In surahs other than Al-Fatiha (1) and At-Tawbah (9), the provider prefixes the
//     Bismillah to verse 1. We *display* that prefix separately as a header so it is not
//     presented as part of verse 1. The split is lossless: header + " " + verse === original.
// Nothing else about the text is changed: diacritics and orthography are preserved exactly.

const BOM = '\uFEFF';

export function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(1) : text;
}

// Arabic harakat, Quranic annotation marks, superscript alif and tatweel. Used only to
// build a comparison skeleton — never to alter displayed text.
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** Letters-only form of Arabic text, for matching. Alif wasla is treated as alif. */
export function arabicSkeleton(text: string): string {
  return stripBom(text).replace(MARKS, '').replace(/\u0671/g, '\u0627').replace(/\s+/g, ' ').trim();
}

/** Skeleton of the Bismillah (letters only, used for detection — never displayed). */
const BISMILLAH_SKELETON = '\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062D\u0645\u0646 \u0627\u0644\u0631\u062D\u064A\u0645';
const BISMILLAH_WORDS = 4;

export interface SplitResult {
  /** Provider text of the Bismillah prefix, exactly as supplied, or null. */
  bismillah: string | null;
  verseText: string;
}

export function surahHasSeparateBismillah(surah: number): boolean {
  return surah !== 1 && surah !== 9;
}

export function splitBismillah(surah: number, firstVerseText: string): SplitResult {
  const text = stripBom(firstVerseText);
  if (!surahHasSeparateBismillah(surah)) return { bismillah: null, verseText: text };
  const words = text.split(' ');
  if (words.length <= BISMILLAH_WORDS) return { bismillah: null, verseText: text };
  const prefix = words.slice(0, BISMILLAH_WORDS).join(' ');
  if (arabicSkeleton(prefix) !== BISMILLAH_SKELETON) return { bismillah: null, verseText: text };
  return { bismillah: prefix, verseText: words.slice(BISMILLAH_WORDS).join(' ') };
}

/** Removes diacritics for *search matching only*. */
export function normalizeForSearch(text: string): string {
  return arabicSkeleton(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[\u2018\u2019'`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
