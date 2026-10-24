import type { EditionInfo, Reciter, SurahAudio, SurahText } from '@/domain/quran/types';

/** Keeps the app independent of any single Quran text/audio provider. */
export interface QuranProvider {
  readonly id: string;
  readonly name: string;
  readonly arabicEdition: EditionInfo;
  readonly translationEdition: EditionInfo;
  readonly reciters: readonly Reciter[];
  getSurah(surah: number, options: { translation: boolean; signal?: AbortSignal }): Promise<SurahText>;
  getSurahAudio(surah: number, reciterId: string, options?: { signal?: AbortSignal }): Promise<SurahAudio>;
}
