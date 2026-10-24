// Empty starting shapes for each content type. They contain structure only — every
// religious field starts blank and must be filled from a cited source.
import type { ContentClass } from '@/domain/content/schema';
import type { ContentType } from '@/data/supabase/contentRows';

const emptySources: unknown[] = [];

export const TEMPLATES: Record<ContentType, { contentClass: ContentClass; payload: Record<string, unknown> }> = {
  course: {
    contentClass: 'religious',
    payload: { summary: '', category: 'foundations', level: 'beginner', area: 'knowledge', objectives: [], estimatedMinutes: 10, prerequisites: [], modules: [], sources: emptySources },
  },
  lesson: {
    contentClass: 'religious',
    payload: {
      summary: '',
      courseSlug: '',
      moduleId: '',
      objectives: [''],
      estimatedMinutes: 5,
      steps: [{ kind: 'intro', title: '', body: '', objective: '' }],
      sources: emptySources,
    },
  },
  dua: {
    contentClass: 'religious',
    payload: { summary: '', arabic: '', transliteration: '', translation: '', usage: '', categories: [], sources: emptySources },
  },
  dua_category: { contentClass: 'app-guide', payload: { description: '', order: 100 } },
  salah_path: { contentClass: 'app-guide', payload: { summary: '', order: 100 } },
  salah_guide: {
    contentClass: 'religious',
    payload: { summary: '', pathSlug: 'step-by-step', practiceType: 'general', schoolNote: '', estimatedMinutes: 5, steps: [{ id: 'step-1', title: '', explanation: '' }], sources: emptySources },
  },
  story_collection: { contentClass: 'app-guide', payload: { summary: '', order: 100, kind: 'history' } },
  story: {
    contentClass: 'religious',
    payload: { summary: '', collectionSlug: 'prophets', chapters: [{ id: 'chapter-1', title: '', estimatedMinutes: 5, sections: [], keyLessons: [] }], sources: emptySources },
  },
  occasion: {
    contentClass: 'religious',
    payload: { summary: '', rule: { kind: 'day', month: 1, day: 1 }, sections: [], relatedDuaSlugs: [], relatedLessonIds: [], sources: emptySources },
  },
};
