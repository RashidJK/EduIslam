// Adapter for the AlQuran Cloud API (https://alquran.cloud). Licence terms below were
// checked against the providers' published pages; see docs/SOURCES.md.
import { z } from 'zod';
import { verifySurahVerses } from '@/domain/quran/integrity';
import { getSurahMeta, verseKey } from '@/domain/quran/metadata';
import { splitBismillah, stripBom } from '@/domain/quran/text';
import {
  QuranIntegrityError,
  QuranProviderError,
  type EditionInfo,
  type LicenseInfo,
  type Reciter,
  type SurahAudio,
  type SurahText,
} from '@/domain/quran/types';
import type { QuranProvider } from './provider';

const PROVIDER = 'AlQuran Cloud';

const TANZIL_LICENSE: LicenseInfo = {
  name: 'Tanzil Quran Text — Creative Commons Attribution 3.0',
  url: 'https://tanzil.net/docs/text_license',
  terms:
    'Verbatim copies may be used in any website or application if the Tanzil Project is clearly credited and linked. Changing the text is not allowed.',
  verified: true,
  commercialUse: 'allowed',
};

const SAHIH_LICENSE: LicenseInfo = {
  name: 'Saheeh International translation via Tanzil',
  url: 'https://tanzil.net/trans/',
  terms: 'Tanzil provides its translations for non-commercial purposes only. Other uses need permission from the translator or publisher.',
  verified: true,
  commercialUse: 'permission-required',
};

const AUDIO_LICENSE: LicenseInfo = {
  name: 'Islamic Network audio CDN',
  url: 'https://alquran.cloud/terms-and-conditions',
  terms:
    'Recitations are licensed for free, non-commercial redistribution; streaming is allowed for personal and educational use. Reciters keep their copyrights.',
  verified: true,
  commercialUse: 'permission-required',
};

export const ALQURAN_ARABIC_EDITION: EditionInfo = {
  provider: PROVIDER,
  identifier: 'quran-uthmani',
  name: 'Uthmani script (Tanzil)',
  language: 'ar',
  direction: 'rtl',
  attribution: 'Quran text: Tanzil Project',
  attributionUrl: 'https://tanzil.net',
  license: TANZIL_LICENSE,
};

export const ALQURAN_TRANSLATION_EDITION: EditionInfo = {
  provider: PROVIDER,
  identifier: 'en.sahih',
  name: 'Saheeh International',
  language: 'en',
  direction: 'ltr',
  attribution: 'Translation: Saheeh International',
  attributionUrl: 'https://tanzil.net/trans/',
  license: SAHIH_LICENSE,
};

/** Reciters confirmed to be available verse-by-verse from the provider. */
export const ALQURAN_RECITERS: readonly Reciter[] = [
  { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy', provider: PROVIDER, license: AUDIO_LICENSE },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', provider: PROVIDER, license: AUDIO_LICENSE },
  { id: 'ar.minshawi', name: 'Mohamed Siddiq El-Minshawi', provider: PROVIDER, license: AUDIO_LICENSE },
  { id: 'ar.abdurrahmaansudais', name: 'Abdul Rahman Al-Sudais', provider: PROVIDER, license: AUDIO_LICENSE },
  { id: 'ar.mahermuaiqly', name: 'Maher Al-Muaiqly', provider: PROVIDER, license: AUDIO_LICENSE },
];

const AyahSchema = z.object({
  number: z.number().int(),
  text: z.string(),
  numberInSurah: z.number().int(),
  juz: z.number().int(),
  page: z.number().int(),
  sajda: z.union([z.boolean(), z.looseObject({})]),
  audio: z.string().optional(),
  audioSecondary: z.array(z.string()).optional(),
});

const EditionPayloadSchema = z.object({
  number: z.number().int(),
  edition: z.object({ identifier: z.string() }),
  ayahs: z.array(AyahSchema),
});

const MultiResponseSchema = z.object({ code: z.literal(200), data: z.array(EditionPayloadSchema) });
const SingleResponseSchema = z.object({ code: z.literal(200), data: EditionPayloadSchema });

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

async function getJson(fetchImpl: FetchLike, url: string, signal?: AbortSignal): Promise<unknown> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new QuranProviderError('offline', 'You appear to be offline.');
  }
  let res: Response;
  try {
    res = await fetchImpl(url, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new QuranProviderError('network', 'The Quran service could not be reached.');
  }
  if (!res.ok) throw new QuranProviderError('http', `The Quran service responded with status ${res.status}.`);
  try {
    return await res.json();
  } catch {
    throw new QuranProviderError('shape', 'The Quran service returned an unreadable response.');
  }
}

function parse<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const r = schema.safeParse(body);
  if (!r.success) throw new QuranProviderError('shape', 'The Quran service returned data in an unexpected format.');
  return r.data;
}

const isHttpsUrl = (u: string) => {
  try {
    return new URL(u).protocol === 'https:';
  } catch {
    return false;
  }
};

export function createAlQuranCloudProvider(options: { apiBase: string; fetch?: FetchLike }): QuranProvider {
  const base = options.apiBase.replace(/\/+$/, '');
  const fetchImpl: FetchLike = options.fetch ?? ((i, init) => fetch(i, init));

  return {
    id: 'alquran-cloud',
    name: PROVIDER,
    arabicEdition: ALQURAN_ARABIC_EDITION,
    translationEdition: ALQURAN_TRANSLATION_EDITION,
    reciters: ALQURAN_RECITERS,

    async getSurah(surah, { translation, signal }): Promise<SurahText> {
      const meta = getSurahMeta(surah);
      if (!meta) throw new RangeError(`Unknown surah ${surah}`);
      const editions = [ALQURAN_ARABIC_EDITION.identifier, ...(translation ? [ALQURAN_TRANSLATION_EDITION.identifier] : [])];
      const body = parse(MultiResponseSchema, await getJson(fetchImpl, `${base}/surah/${surah}/editions/${editions.join(',')}`, signal));

      const arabic = body.data.find((e) => e.edition.identifier === ALQURAN_ARABIC_EDITION.identifier);
      const trans = translation ? body.data.find((e) => e.edition.identifier === ALQURAN_TRANSLATION_EDITION.identifier) : undefined;
      if (!arabic || (translation && !trans)) throw new QuranProviderError('shape', 'A requested edition was missing from the response.');
      if (arabic.number !== surah || (trans && trans.number !== surah)) throw new QuranIntegrityError([`Received surah ${arabic.number}, expected ${surah}`]);

      const toRaw = (e: typeof arabic) => e.ayahs.map((a) => ({ numberInSurah: a.numberInSurah, globalNumber: a.number, text: a.text }));
      const problems = verifySurahVerses(surah, [
        { label: 'Arabic text', verses: toRaw(arabic) },
        ...(trans ? [{ label: 'Translation', verses: toRaw(trans) }] : []),
      ]);
      if (problems.length) throw new QuranIntegrityError(problems);

      const first = splitBismillah(surah, arabic.ayahs[0]!.text);
      return {
        surah: meta,
        bismillah: first.bismillah,
        verses: arabic.ayahs.map((a, i) => ({
          number: a.numberInSurah,
          globalNumber: a.number,
          key: verseKey(surah, a.numberInSurah),
          arabic: i === 0 ? first.verseText : stripBom(a.text),
          translation: trans ? trans.ayahs[i]!.text : null,
          juz: a.juz,
          page: a.page,
          sajda: a.sajda !== false,
        })),
        arabicEdition: ALQURAN_ARABIC_EDITION,
        translationEdition: trans ? ALQURAN_TRANSLATION_EDITION : null,
        fetchedAt: new Date().toISOString(),
      };
    },

    async getSurahAudio(surah, reciterId, opts): Promise<SurahAudio> {
      const reciter = ALQURAN_RECITERS.find((r) => r.id === reciterId);
      if (!reciter) throw new QuranProviderError('shape', 'This reciter is not available.');
      const body = parse(SingleResponseSchema, await getJson(fetchImpl, `${base}/surah/${surah}/${reciter.id}`, opts?.signal));
      if (body.data.number !== surah) throw new QuranIntegrityError([`Received audio for surah ${body.data.number}, expected ${surah}`]);
      const problems = verifySurahVerses(surah, [
        { label: 'Audio', verses: body.data.ayahs.map((a) => ({ numberInSurah: a.numberInSurah, globalNumber: a.number, text: a.audio ?? '' })) },
      ]);
      // Only use audio URLs the provider actually supplied; never construct them.
      if (body.data.ayahs.some((a) => !a.audio || !isHttpsUrl(a.audio))) problems.push('Audio is missing for one or more verses');
      if (problems.length) throw new QuranIntegrityError(problems);
      return {
        surah,
        reciter,
        verses: body.data.ayahs.map((a) => ({
          verse: a.numberInSurah,
          globalNumber: a.number,
          url: a.audio!,
          fallbackUrls: (a.audioSecondary ?? []).filter(isHttpsUrl),
        })),
      };
    },
  };
}
