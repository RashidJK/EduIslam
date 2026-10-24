import type { Page } from '@playwright/test';
import metadata from '../src/data/quran/surahs.generated.json' with { type: 'json' };

const offsets: number[] = [];
metadata.surahs.reduce((acc, s) => {
  offsets.push(acc);
  return acc + s.verseCount;
}, 0);

function payload(surah: number, identifier: string, audio: boolean) {
  const meta = metadata.surahs[surah - 1]!;
  return {
    number: surah,
    edition: { identifier },
    // Structural placeholders only: end-to-end tests never contain real Quranic text.
    ayahs: Array.from({ length: meta.verseCount }, (_, i) => ({
      number: offsets[surah - 1]! + i + 1,
      numberInSurah: i + 1,
      text: identifier === 'en.sahih' ? `[e2e translation ${surah}:${i + 1}]` : `[e2e arabic ${surah}:${i + 1}]`,
      juz: 1,
      page: 1,
      sajda: false,
      ...(audio ? { audio: `https://cdn.islamic.network/e2e/${surah}/${i + 1}.mp3`, audioSecondary: [] } : {}),
    })),
  };
}

/** Serves the Quran provider API from placeholders so tests are fast, offline, and text-free. */
export async function mockQuranProvider(page: Page) {
  await page.route('https://api.alquran.cloud/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const multi = /\/surah\/(\d+)\/editions\/([\w.,-]+)$/.exec(url.pathname);
    const single = /\/surah\/(\d+)\/([\w.-]+)$/.exec(url.pathname);
    if (multi) {
      const surah = Number(multi[1]);
      const data = multi[2]!.split(',').map((e) => payload(surah, e, false));
      return route.fulfill({ json: { code: 200, status: 'OK', data } });
    }
    if (single) return route.fulfill({ json: { code: 200, status: 'OK', data: payload(Number(single[1]), single[2]!, true) } });
    return route.fulfill({ status: 404, json: { code: 404 } });
  });
  await page.route('https://cdn.islamic.network/**', (route) => route.fulfill({ status: 404, body: '' }));
}

export async function skipOnboarding(page: Page) {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: /skip for now/i }).click();
  await page.waitForURL('**/app');
}
