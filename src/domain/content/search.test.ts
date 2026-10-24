import { describe, expect, it } from 'vitest';
import { DuaSchema, DuaCategorySchema } from './library';
import { filterDuas } from './search';
import { fixtureDua } from '@/test/fixtures/content';

const categories = [
  DuaCategorySchema.parse({ slug: 'travel', title: 'Travel', description: '', order: 1 }),
  DuaCategorySchema.parse({ slug: 'everyday', title: 'Everyday situations', description: '', order: 2 }),
];
const duas = [
  DuaSchema.parse(fixtureDua({ id: 'a', slug: 'a', title: 'Fixture for journeys', categories: ['travel'], usage: 'TEST FIXTURE — when setting out' })),
  DuaSchema.parse(fixtureDua({ id: 'b', slug: 'b', title: 'Fixture for meals', categories: ['everyday'] })),
];

describe('filterDuas', () => {
  it('filters by category', () => {
    expect(filterDuas(duas, categories, { category: 'travel' }).map((d) => d.id)).toEqual(['a']);
    expect(filterDuas(duas, categories, { category: null })).toHaveLength(2);
  });

  it('searches titles, usage, and category names, ignoring case', () => {
    expect(filterDuas(duas, categories, { query: 'SETTING out' }).map((d) => d.id)).toEqual(['a']);
    expect(filterDuas(duas, categories, { query: 'everyday' }).map((d) => d.id)).toEqual(['b']);
    expect(filterDuas(duas, categories, { query: 'fixture meals' }).map((d) => d.id)).toEqual(['b']);
  });

  it('combines query and category, and returns empty when nothing matches', () => {
    expect(filterDuas(duas, categories, { query: 'meals', category: 'travel' })).toEqual([]);
    expect(filterDuas(duas, categories, { query: 'zzz' })).toEqual([]);
  });
});
