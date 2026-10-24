// A structural stand-in for the Quran provider in UI tests. Verse text is an obvious
// placeholder — tests must never contain real or invented Quranic text.
import type { QuranProvider } from '@/data/quran/provider';
import { ALQURAN_ARABIC_EDITION, ALQURAN_RECITERS, ALQURAN_TRANSLATION_EDITION } from '@/data/quran/alquranCloud';
import { getSurahMeta, globalVerseNumber, verseKey } from '@/domain/quran/metadata';
import type { SurahAudio, SurahText } from '@/domain/quran/types';

export function createFakeQuranProvider(overrides: Partial<QuranProvider> = {}): QuranProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    id: 'fake',
    name: 'Fake provider',
    arabicEdition: ALQURAN_ARABIC_EDITION,
    translationEdition: ALQURAN_TRANSLATION_EDITION,
    reciters: ALQURAN_RECITERS,
    calls,
    async getSurah(surah, { translation }): Promise<SurahText> {
      calls.push(`surah:${surah}`);
      const meta = getSurahMeta(surah)!;
      return {
        surah: meta,
        bismillah: surah === 1 || surah === 9 ? null : '[placeholder bismillah]',
        verses: Array.from({ length: meta.verseCount }, (_, i) => ({
          number: i + 1,
          globalNumber: globalVerseNumber(surah, i + 1),
          key: verseKey(surah, i + 1),
          arabic: `[placeholder arabic ${surah}:${i + 1}]`,
          translation: translation ? `[placeholder translation ${surah}:${i + 1}]` : null,
          juz: 1,
          page: 1,
          sajda: false,
        })),
        arabicEdition: ALQURAN_ARABIC_EDITION,
        translationEdition: translation ? ALQURAN_TRANSLATION_EDITION : null,
        fetchedAt: new Date(0).toISOString(),
      };
    },
    async getSurahAudio(surah, reciterId): Promise<SurahAudio> {
      calls.push(`audio:${surah}:${reciterId}`);
      const meta = getSurahMeta(surah)!;
      return {
        surah,
        reciter: ALQURAN_RECITERS.find((r) => r.id === reciterId) ?? ALQURAN_RECITERS[0]!,
        verses: Array.from({ length: meta.verseCount }, (_, i) => ({
          verse: i + 1,
          globalNumber: globalVerseNumber(surah, i + 1),
          url: `https://audio.test/${surah}/${i + 1}.mp3`,
          fallbackUrls: [],
        })),
      };
    },
    ...overrides,
  };
}
