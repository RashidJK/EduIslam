import { describe, expect, it } from 'vitest';
import { bundledCatalog, bundledContent } from './bundled';
import { buildCatalog } from './catalog';
import { createCatalogRepository } from './repository';
import { isLearnerVisible, publishingProblems } from '@/domain/content/schema';
import { fixtureDua, fixturePacks, FIXTURE_REVIEW, FIXTURE_SOURCE } from '@/test/fixtures/content';

describe('bundled content packs', () => {
  it('validate with no issues', () => {
    expect(bundledCatalog.issues).toEqual([]);
  });

  it('ship no religious content that bypasses review', () => {
    const religious = [
      ...bundledCatalog.courses,
      ...bundledCatalog.lessons,
      ...bundledCatalog.duas,
      ...bundledCatalog.salahGuides,
      ...bundledCatalog.stories,
      ...bundledCatalog.occasions,
    ].filter((i) => i.contentClass === 'religious');
    for (const item of religious) {
      if (item.status === 'published') {
        expect(item.sources.length, item.id).toBeGreaterThan(0);
        expect(item.review.reviewer, item.id).toBeTruthy();
      }
    }
  });

  it('expose the getting-started and Arabic letters courses with their lessons in order', async () => {
    const slugs = (await bundledContent.listCourses()).map((c) => c.slug);
    expect(slugs).toEqual(['getting-started', 'arabic-letters']);
    expect((await bundledContent.listLessons('arabic-letters')).map((l) => l.id)).toEqual(['letters-1', 'letters-2', 'letters-3']);
  });

  it('list occasion dates while keeping unreviewed occasion content hidden', async () => {
    const dates = await bundledContent.listOccasionDates();
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.every((d) => !d.hasPublishedContent)).toBe(true);
    expect(await bundledContent.getOccasionContent('ramadan')).toBeNull();
  });
});

describe('publishing gate', () => {
  it('rejects religious content marked published without sources or a reviewer', () => {
    const catalog = buildCatalog(fixturePacks({ duas: [fixtureDua({ sources: [], review: { reviewer: null, reviewedOn: null, version: 1 } })] }));
    expect(catalog.duas).toHaveLength(0);
    expect(catalog.issues[0]?.messages.join(' ')).toMatch(/at least one source/);
    expect(catalog.issues[0]?.messages.join(' ')).toMatch(/named reviewer/);
  });

  it('keeps reviewed drafts away from learners until published', async () => {
    const repo = createCatalogRepository(buildCatalog(fixturePacks({ duas: [fixtureDua({ status: 'approved' })] })));
    expect(await repo.listDuas()).toEqual([]);
    expect(await repo.getDua('fixture-one')).toBeNull();
  });

  it('shows published, sourced, reviewed content', async () => {
    const repo = createCatalogRepository(buildCatalog(fixturePacks({ duas: [fixtureDua()] })));
    expect((await repo.listDuas()).map((d) => d.slug)).toEqual(['fixture-one']);
  });

  it('refuses duas that are not classed as religious content', () => {
    const catalog = buildCatalog(fixturePacks({ duas: [fixtureDua({ contentClass: 'sample', notice: 'x' })] }));
    expect(catalog.duas).toHaveLength(0);
  });

  it('requires an authenticity grading to cite one of the item’s sources', () => {
    const catalog = buildCatalog(fixturePacks({ duas: [fixtureDua({ authenticity: { grade: 'Test grade', gradedBy: 'Test', sourceId: 'missing' } })] }));
    expect(catalog.issues[0]?.messages.join(' ')).toMatch(/unknown source "missing"/);
  });

  it('requires a visible notice on sample content', () => {
    expect(publishingProblems({ contentClass: 'sample', sources: [], review: { reviewer: null, reviewedOn: null, version: 1 } })).toHaveLength(1);
    expect(
      isLearnerVisible({ status: 'published', contentClass: 'sample', notice: 'Sample', sources: [], review: { reviewer: null, reviewedOn: null, version: 1 } }),
    ).toBe(true);
  });

  it('hides lessons whose course is not visible', async () => {
    const lesson = {
      id: 'l-x',
      slug: 'l-x',
      title: 'L',
      summary: '',
      language: 'en',
      status: 'published',
      contentClass: 'app-guide',
      sources: [],
      review: { reviewer: null, reviewedOn: null, version: 1 },
      courseSlug: 'draft-course',
      moduleId: 'm',
      objectives: ['o'],
      estimatedMinutes: 2,
      steps: [{ kind: 'read', title: 't', body: 'b' }],
    };
    const course = {
      id: 'c-x',
      slug: 'draft-course',
      title: 'C',
      summary: '',
      language: 'en',
      status: 'draft',
      contentClass: 'religious',
      sources: [FIXTURE_SOURCE],
      review: FIXTURE_REVIEW,
      category: 'fiqh',
      level: 'beginner',
      area: 'knowledge',
      objectives: [],
      estimatedMinutes: 2,
      prerequisites: [],
      modules: [{ id: 'm', title: 'M', lessonIds: ['l-x'] }],
    };
    const repo = createCatalogRepository(buildCatalog(fixturePacks({ courses: [course], lessons: [lesson] })));
    expect(await repo.getLesson('l-x')).toBeNull();
  });

  it('rejects lessons whose answer key is not among the options', () => {
    const catalog = buildCatalog(
      fixturePacks({
        lessons: [
          {
            id: 'bad',
            slug: 'bad',
            title: 'Bad',
            summary: '',
            language: 'en',
            status: 'draft',
            contentClass: 'app-guide',
            sources: [],
            review: { reviewer: null, reviewedOn: null, version: 1 },
            courseSlug: 'c',
            moduleId: 'm',
            objectives: ['o'],
            estimatedMinutes: 2,
            steps: [
              {
                kind: 'question',
                question: { id: 'q', type: 'single-choice', prompt: 'p', explanation: 'e', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], correctOptionId: 'z' },
              },
            ],
          },
        ],
      }),
    );
    expect(catalog.issues[0]?.messages.join(' ')).toMatch(/not one of the options/);
  });
});
