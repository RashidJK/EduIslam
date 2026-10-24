// TEST FIXTURES ONLY. These records exist to exercise the content pipeline. Their text is
// deliberately placeholder and must never be imported by application code or shipped.
import type { ContentPacks } from '@/data/content/catalog';

export const FIXTURE_REVIEW = { reviewer: 'Test Reviewer', reviewedOn: '2026-01-01', version: 1 };
export const FIXTURE_SOURCE = { id: 'src-fixture', type: 'other', title: 'Test fixture source (not a real reference)' };

export function fixtureDua(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dua-fixture-1',
    slug: 'fixture-one',
    title: 'Fixture dua one',
    summary: 'Placeholder used by automated tests.',
    language: 'en',
    status: 'published',
    contentClass: 'religious',
    sources: [FIXTURE_SOURCE],
    review: FIXTURE_REVIEW,
    arabic: 'ا ب ت',
    transliteration: 'alif ba ta',
    translation: 'TEST FIXTURE — placeholder translation',
    usage: 'TEST FIXTURE — placeholder usage note',
    categories: ['everyday'],
    ...overrides,
  };
}

export function fixtureSalahGuide(overrides: Record<string, unknown> = {}) {
  return {
    id: 'salah-fixture-1',
    slug: 'fixture-guide',
    title: 'Fixture guide',
    summary: 'Placeholder guide used by automated tests.',
    language: 'en',
    status: 'published',
    contentClass: 'religious',
    sources: [FIXTURE_SOURCE],
    review: FIXTURE_REVIEW,
    pathSlug: 'step-by-step',
    practiceType: 'obligatory',
    schoolNote: 'TEST FIXTURE — placeholder note about schools.',
    estimatedMinutes: 4,
    steps: [
      { id: 's1', title: 'Fixture step one', explanation: 'TEST FIXTURE — first step.', whyItMatters: 'TEST FIXTURE — why.' },
      { id: 's2', title: 'Fixture step two', explanation: 'TEST FIXTURE — second step.', recitation: { arabic: 'ا ب', translation: 'TEST FIXTURE — meaning', sourceId: 'src-fixture' } },
      { id: 's3', title: 'Fixture step three', explanation: 'TEST FIXTURE — third step.' },
    ],
    ...overrides,
  };
}

export function fixtureStory(overrides: Record<string, unknown> = {}) {
  return {
    id: 'story-fixture-1',
    slug: 'fixture-story',
    title: 'Fixture story',
    summary: 'Placeholder story used by automated tests.',
    language: 'en',
    status: 'published',
    contentClass: 'religious',
    sources: [FIXTURE_SOURCE],
    review: FIXTURE_REVIEW,
    collectionSlug: 'prophets',
    chapters: [
      {
        id: 'c1',
        title: 'Fixture chapter one',
        estimatedMinutes: 3,
        sections: [
          { kind: 'quran', text: 'TEST FIXTURE — summary of a Quranic passage.', sourceIds: ['src-fixture'], quranRefs: ['12:4-6'] },
          { kind: 'historical', text: 'TEST FIXTURE — a later account.', sourceIds: ['src-fixture'], differenceNote: 'TEST FIXTURE — accounts vary.' },
        ],
        keyLessons: ['TEST FIXTURE — a reflection.'],
        check: [
          {
            id: 'chk1',
            type: 'single-choice',
            prompt: 'TEST FIXTURE — which label marks later accounts?',
            options: [
              { id: 'a', label: 'Later historical account' },
              { id: 'b', label: 'From the Quran' },
            ],
            correctOptionId: 'a',
            explanation: 'TEST FIXTURE — explanation.',
          },
        ],
      },
      { id: 'c2', title: 'Fixture chapter two', estimatedMinutes: 3, sections: [{ kind: 'commentary', text: 'TEST FIXTURE — commentary.', sourceIds: ['src-fixture'] }], keyLessons: [] },
    ],
    ...overrides,
  };
}

export function fixtureOccasion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'occasion-ramadan',
    slug: 'ramadan',
    title: 'Ramadan',
    summary: 'TEST FIXTURE — placeholder summary.',
    language: 'en',
    status: 'published',
    contentClass: 'religious',
    sources: [FIXTURE_SOURCE],
    review: FIXTURE_REVIEW,
    rule: { kind: 'month', month: 9 },
    sections: [{ kind: 'commentary', text: 'TEST FIXTURE — occasion content.', sourceIds: ['src-fixture'] }],
    relatedDuaSlugs: [],
    relatedLessonIds: [],
    ...overrides,
  };
}

export function fixturePacks(overrides: Partial<ContentPacks> = {}): ContentPacks {
  return {
    courses: [],
    lessons: [],
    duaCategories: [
      { slug: 'everyday', title: 'Everyday situations', description: '', order: 2 },
      { slug: 'travel', title: 'Travel', description: '', order: 1 },
    ],
    duas: [],
    salahPaths: [{ slug: 'step-by-step', title: 'Step-by-step', summary: '', order: 1 }],
    salahGuides: [],
    storyCollections: [{ slug: 'prophets', title: 'Prophets', summary: '', order: 1, kind: 'prophets' }],
    stories: [],
    occasions: [],
    ...overrides,
  };
}
