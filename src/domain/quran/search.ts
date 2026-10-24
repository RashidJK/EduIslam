import { SURAHS, type SurahMeta } from './metadata';
import { normalizeForSearch } from './text';

/** Loose Latin matching for transliterated names: "Faatiha", "fatihah" and "Fatiha" all match. */
function looseLatin(text: string): string {
  return normalizeForSearch(text)
    .replace(/[^a-z0-9؀-ۿ ]/g, '')
    .replace(/([aeiou])\1+/g, '$1')
    .replace(/ah\b/g, 'a')
    .replace(/\bal ?/g, '')
    .replace(/\s+/g, '');
}

export function searchSurahs(query: string, surahs: readonly SurahMeta[] = SURAHS): SurahMeta[] {
  const q = query.trim();
  if (!q) return [...surahs];
  if (/^\d{1,3}$/.test(q)) return surahs.filter((s) => String(s.number).startsWith(q));
  const loose = looseLatin(q);
  const arabic = normalizeForSearch(q);
  return surahs.filter(
    (s) =>
      (loose && looseLatin(s.nameTransliterated).includes(loose)) ||
      (loose && looseLatin(s.nameTranslated).includes(loose)) ||
      normalizeForSearch(s.nameArabic).includes(arabic),
  );
}
