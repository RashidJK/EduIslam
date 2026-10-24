import { describe, expect, it, vi } from 'vitest';
import fixtures from '../../../tests/fixtures/quran-first-verses.json';
import { createAlQuranCloudProvider } from './alquranCloud';
import { globalVerseNumber, getSurahMeta } from '@/domain/quran/metadata';
import { QuranIntegrityError, QuranProviderError } from '@/domain/quran/types';

// Builds a provider-shaped response. Verse 1 uses real provider text from the fixture;
// later verses use obvious placeholders because only structure is under test.
function surahPayload(surah: number, identifier: string, opts: { count?: number; audio?: boolean } = {}) {
  const count = opts.count ?? getSurahMeta(surah)!.verseCount;
  return {
    number: surah,
    edition: { identifier },
    ayahs: Array.from({ length: count }, (_, i) => ({
      number: globalVerseNumber(surah, 1) + i,
      numberInSurah: i + 1,
      text: i === 0 && identifier === 'quran-uthmani' ? fixtures.firstVerses[surah - 1]!.text : `placeholder ${i + 1}`,
      juz: 30,
      page: 600,
      sajda: false,
      ...(opts.audio ? { audio: `https://cdn.example.org/${globalVerseNumber(surah, 1) + i}.mp3`, audioSecondary: [] } : {}),
    })),
  };
}

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe('AlQuran Cloud provider', () => {
  it('returns verified text with the Bismillah separated from verse 1', async () => {
    const fetchMock = vi.fn(() => ok({ code: 200, data: [surahPayload(112, 'quran-uthmani'), surahPayload(112, 'en.sahih')] }));
    const provider = createAlQuranCloudProvider({ apiBase: 'https://api.example.org/v1/', fetch: fetchMock });
    const surah = await provider.getSurah(112, { translation: true });
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.org/v1/surah/112/editions/quran-uthmani,en.sahih', expect.anything());
    expect(surah.verses).toHaveLength(4);
    expect(surah.bismillah).not.toBeNull();
    expect(`${surah.bismillah} ${surah.verses[0]!.arabic}`).toBe(fixtures.firstVerses[111]!.text);
    expect(surah.verses[1]?.translation).toBe('placeholder 2');
    expect(surah.arabicEdition.license.name).toMatch(/Tanzil/);
  });

  it('keeps verse 1 of Al-Fatiha intact (the Bismillah is verse 1 there)', async () => {
    const provider = createAlQuranCloudProvider({ apiBase: 'https://x.org', fetch: () => ok({ code: 200, data: [surahPayload(1, 'quran-uthmani')] }) });
    const surah = await provider.getSurah(1, { translation: false });
    expect(surah.bismillah).toBeNull();
    expect(surah.verses[0]!.arabic).toBe(fixtures.firstVerses[0]!.text.replace(/^\uFEFF/, ''));
    expect(surah.translationEdition).toBeNull();
  });

  it('refuses to return text when verses are missing', async () => {
    const provider = createAlQuranCloudProvider({ apiBase: 'https://x.org', fetch: () => ok({ code: 200, data: [surahPayload(112, 'quran-uthmani', { count: 3 })] }) });
    await expect(provider.getSurah(112, { translation: false })).rejects.toBeInstanceOf(QuranIntegrityError);
  });

  it('reports HTTP, network, and shape problems distinctly', async () => {
    const http = createAlQuranCloudProvider({ apiBase: 'https://x.org', fetch: () => Promise.resolve(new Response('', { status: 503 })) });
    await expect(http.getSurah(1, { translation: false })).rejects.toMatchObject({ kind: 'http' });
    const net = createAlQuranCloudProvider({ apiBase: 'https://x.org', fetch: () => Promise.reject(new TypeError('Failed to fetch')) });
    await expect(net.getSurah(1, { translation: false })).rejects.toMatchObject({ kind: 'network' });
    const shape = createAlQuranCloudProvider({ apiBase: 'https://x.org', fetch: () => ok({ code: 200, data: 'nope' }) });
    await expect(shape.getSurah(1, { translation: false })).rejects.toBeInstanceOf(QuranProviderError);
  });

  it('reports offline before trying the network', async () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const fetchMock = vi.fn();
    const provider = createAlQuranCloudProvider({ apiBase: 'https://x.org', fetch: fetchMock });
    await expect(provider.getSurah(1, { translation: false })).rejects.toMatchObject({ kind: 'offline' });
    expect(fetchMock).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('uses only audio URLs supplied by the provider', async () => {
    const provider = createAlQuranCloudProvider({ apiBase: 'https://x.org', fetch: () => ok({ code: 200, data: surahPayload(112, 'ar.alafasy', { audio: true }) }) });
    const audio = await provider.getSurahAudio(112, 'ar.alafasy');
    expect(audio.verses.map((v) => v.url)).toEqual([0, 1, 2, 3].map((i) => `https://cdn.example.org/${globalVerseNumber(112, 1) + i}.mp3`));
    const missing = createAlQuranCloudProvider({ apiBase: 'https://x.org', fetch: () => ok({ code: 200, data: surahPayload(112, 'ar.alafasy') }) });
    await expect(missing.getSurahAudio(112, 'ar.alafasy')).rejects.toBeInstanceOf(QuranIntegrityError);
  });

  it('rejects unknown reciters', async () => {
    const provider = createAlQuranCloudProvider({ apiBase: 'https://x.org', fetch: vi.fn() });
    await expect(provider.getSurahAudio(1, 'ar.unknown')).rejects.toBeInstanceOf(QuranProviderError);
  });
});
