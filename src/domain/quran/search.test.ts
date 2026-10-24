import { describe, expect, it } from 'vitest';
import { SURAHS } from './metadata';
import { searchSurahs } from './search';

const numbers = (q: string) => searchSurahs(q).map((s) => s.number);

describe('searchSurahs', () => {
  it('returns all surahs for an empty query', () => {
    expect(searchSurahs('')).toHaveLength(114);
  });

  it('matches transliterations loosely', () => {
    expect(numbers('fatiha')).toContain(1);
    expect(numbers('Al-Fatihah')).toContain(1);
    expect(numbers('baqarah')).toContain(2);
    expect(numbers('kahf')).toContain(18);
  });

  it('matches translated names and numbers', () => {
    expect(numbers('the opening')).toContain(1);
    expect(numbers('112')).toEqual([112]);
    expect(numbers('11')).toEqual([11, 110, 111, 112, 113, 114]);
  });

  it('matches Arabic names ignoring diacritics', () => {
    // Search with the provider's own Arabic name with its marks stripped.
    const bareName = SURAHS[17]!.nameArabic.replace(/[ً-ٰٟ]/g, '').split(' ').pop()!;
    expect(numbers(bareName)).toContain(18);
  });

  it('returns nothing for nonsense', () => {
    expect(numbers('zzzqqq')).toEqual([]);
  });
});
