import type { SurahMeta } from './metadata';

export interface LicenseInfo {
  name: string;
  url?: string;
  terms: string;
  /** Whether the terms have been checked against the provider's published licence. */
  verified: boolean;
  commercialUse: 'allowed' | 'permission-required' | 'unknown';
}

export interface EditionInfo {
  provider: string;
  identifier: string;
  name: string;
  language: string;
  direction: 'rtl' | 'ltr';
  attribution: string;
  attributionUrl?: string;
  license: LicenseInfo;
}

export interface Verse {
  /** Number within the surah. */
  number: number;
  /** Global number (1–6236). */
  globalNumber: number;
  key: string;
  arabic: string;
  translation: string | null;
  juz: number;
  page: number;
  sajda: boolean;
}

export interface SurahText {
  surah: SurahMeta;
  /** Provider text of the Bismillah shown above verse 1 (not part of the verse numbering). */
  bismillah: string | null;
  verses: Verse[];
  arabicEdition: EditionInfo;
  translationEdition: EditionInfo | null;
  fetchedAt: string;
}

export interface Reciter {
  id: string;
  name: string;
  provider: string;
  license: LicenseInfo;
}

export interface VerseAudio {
  verse: number;
  globalNumber: number;
  url: string;
  fallbackUrls: string[];
}

export interface SurahAudio {
  surah: number;
  reciter: Reciter;
  verses: VerseAudio[];
}

export class QuranIntegrityError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Quran text failed integrity checks: ${problems.join('; ')}`);
    this.name = 'QuranIntegrityError';
    this.problems = problems;
  }
}

export class QuranProviderError extends Error {
  readonly kind: 'offline' | 'network' | 'http' | 'shape';
  constructor(kind: QuranProviderError['kind'], message: string) {
    super(message);
    this.name = 'QuranProviderError';
    this.kind = kind;
  }
}
