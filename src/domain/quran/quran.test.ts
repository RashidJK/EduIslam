import { describe, expect, it } from 'vitest';
import fixtures from '../../../tests/fixtures/quran-first-verses.json';
import { SURAHS, SURAH_COUNT, TOTAL_VERSES, globalVerseNumber, parseVerseKey } from './metadata';
import { arabicSkeleton, splitBismillah, stripBom } from './text';
import { verifySurahVerses } from './integrity';

describe('surah metadata integrity', () => {
  it('has 114 surahs numbered 1..114 with 6236 verses in total', () => {
    expect(SURAHS).toHaveLength(SURAH_COUNT);
    SURAHS.forEach((s, i) => expect(s.number).toBe(i + 1));
    expect(SURAHS.reduce((sum, s) => sum + s.verseCount, 0)).toBe(TOTAL_VERSES);
  });

  it('has names and a revelation type for every surah', () => {
    for (const s of SURAHS) {
      expect(s.nameArabic.trim()).not.toBe('');
      expect(s.nameTransliterated.trim()).not.toBe('');
      expect(['Meccan', 'Medinan']).toContain(s.revelationType);
    }
  });

  it('maps surah:verse to global verse numbers', () => {
    expect(globalVerseNumber(1, 1)).toBe(1);
    expect(globalVerseNumber(2, 1)).toBe(8);
    expect(globalVerseNumber(114, SURAHS[113]!.verseCount)).toBe(TOTAL_VERSES);
  });

  it('parses only valid verse keys', () => {
    expect(parseVerseKey('2:255')).toEqual({ surah: 2, verse: 255 });
    expect(parseVerseKey('1:8')).toBeNull();
    expect(parseVerseKey('115:1')).toBeNull();
    expect(parseVerseKey('abc')).toBeNull();
  });
});

describe('Bismillah handling on real provider text', () => {
  const verses = fixtures.firstVerses;

  it('fixture covers every surah', () => {
    expect(verses.map((v) => v.surah)).toEqual(SURAHS.map((s) => s.number));
  });

  it('never splits Al-Fatiha (where the Bismillah is verse 1) or At-Tawbah', () => {
    for (const n of [1, 9]) {
      const original = verses[n - 1]!.text;
      const r = splitBismillah(n, original);
      expect(r.bismillah).toBeNull();
      expect(r.verseText).toBe(stripBom(original));
    }
  });

  it('separates the Bismillah header in all other surahs, losslessly', () => {
    for (const { surah, text } of verses) {
      if (surah === 1 || surah === 9) continue;
      const r = splitBismillah(surah, text);
      expect(r.bismillah, `surah ${surah}`).not.toBeNull();
      expect(r.verseText.length, `surah ${surah}`).toBeGreaterThan(0);
      // The displayed parts reconstruct the provider's text exactly.
      expect(`${r.bismillah} ${r.verseText}`).toBe(stripBom(text));
      expect(arabicSkeleton(r.bismillah!)).toBe(arabicSkeleton(stripBom(verses[0]!.text)));
    }
  });

  it('leaves text untouched when the prefix is not a Bismillah', () => {
    const r = splitBismillah(2, 'نص تجريبي بدون بسملة هنا');
    expect(r.bismillah).toBeNull();
    expect(r.verseText).toBe('نص تجريبي بدون بسملة هنا');
  });

  it('only strips a leading byte-order mark', () => {
    expect(stripBom('\uFEFFabc')).toBe('abc');
    expect(stripBom('a\uFEFFbc')).toBe('a\uFEFFbc');
  });
});

describe('verifySurahVerses', () => {
  const make = (surah: number, count: number) =>
    Array.from({ length: count }, (_, i) => ({ numberInSurah: i + 1, globalNumber: globalVerseNumber(surah, 1) + i, text: 'x' }));

  it('accepts a correctly numbered surah', () => {
    expect(verifySurahVerses(112, [{ label: 'arabic', verses: make(112, 4) }])).toEqual([]);
  });

  it('rejects missing verses, bad numbering, and empty text', () => {
    expect(verifySurahVerses(112, [{ label: 'arabic', verses: make(112, 3) }])[0]).toMatch(/expected 4 verses/);
    const misnumbered = make(112, 4);
    misnumbered[2] = { ...misnumbered[2]!, numberInSurah: 9 };
    expect(verifySurahVerses(112, [{ label: 'arabic', verses: misnumbered }]).join()).toMatch(/numbered 9/);
    const empty = make(112, 4);
    empty[0] = { ...empty[0]!, text: ' ' };
    expect(verifySurahVerses(112, [{ label: 'arabic', verses: empty }]).join()).toMatch(/empty/);
  });
});
