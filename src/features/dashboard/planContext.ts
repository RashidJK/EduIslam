// Gathers everything the plan engine needs from learner state and published content.
import type { Dua, SalahGuide, Story, StoryCollection } from '@/domain/content/library';
import { dueDuas, dueMemorization } from '@/domain/learner/actions';
import type { LearnerState } from '@/domain/learner/schema';
import type { Course, Lesson } from '@/domain/lessons/schema';
import type { LessonCandidate, PlanContext } from '@/domain/plan/engine';
import { getSurahMeta } from '@/domain/quran/metadata';
import { addDays, type LocalDateKey } from '@/domain/time';

export interface PublishedContent {
  courses: readonly Course[];
  lessons: readonly Lesson[];
  duas: readonly Dua[];
  salahGuides: readonly SalahGuide[];
  stories: readonly Story[];
  storyCollections: readonly StoryCollection[];
}

function lessonCandidate(lesson: Lesson, course: Course): LessonCandidate {
  return { lessonId: lesson.id, title: lesson.title, courseTitle: course.title, category: course.category, minutes: lesson.estimatedMinutes };
}

export function buildPlanContext(state: LearnerState, content: PublishedContent, now: Date, today: LocalDateKey): PlanContext {
  const lessonsById = new Map(content.lessons.map((l) => [l.id, l]));
  const coursesBySlug = new Map(content.courses.map((c) => [c.slug, c]));

  const inProgress = Object.values(state.lessons)
    .filter((p) => p.status === 'in-progress' && lessonsById.has(p.lessonId) && coursesBySlug.has(p.courseSlug))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const nextLessons: LessonCandidate[] = [];
  for (const course of content.courses) {
    const nextId = course.modules
      .flatMap((m) => m.lessonIds)
      .find((id) => lessonsById.has(id) && state.lessons[id]?.status !== 'completed' && id !== inProgress?.lessonId);
    const lesson = nextId ? lessonsById.get(nextId) : undefined;
    if (lesson) nextLessons.push(lessonCandidate(lesson, course));
  }

  const nextDua = content.duas.find((d) => !state.duas[d.id]);
  const nextGuide = content.salahGuides.find((g) => !state.salahProgress[g.slug]?.completed);
  const kindOf = new Map(content.storyCollections.map((c) => [c.slug, c.kind]));
  const nextStory = content.stories.find((s) => (state.storyProgress[s.slug]?.completedChapterIds.length ?? 0) < s.chapters.length);

  const recent = new Set(Array.from({ length: 6 }, (_, i) => addDays(today, -i)));
  const calendarVisitedRecently = Object.entries(state.activity).some(
    ([date, day]) => recent.has(date) && day.records.some((r) => r.type === 'calendar'),
  );

  const reading = state.reading.current;
  const readingMeta = reading ? getSurahMeta(reading.surah) : undefined;

  return {
    today,
    now,
    goals: state.preferences.goals,
    dailyMinutes: state.preferences.dailyMinutes,
    dueMemorizationCount: dueMemorization(state, today).length,
    activeMemorizationCount: state.memorization.filter((m) => !m.archived).length,
    dueDuaCount: dueDuas(state, today).length,
    reading: reading && readingMeta ? { surah: reading.surah, verse: reading.verse, surahName: readingMeta.nameTransliterated } : null,
    inProgressLesson: inProgress ? lessonCandidate(lessonsById.get(inProgress.lessonId)!, coursesBySlug.get(inProgress.courseSlug)!) : null,
    nextLessons,
    nextDua: nextDua ? { id: nextDua.id, slug: nextDua.slug, title: nextDua.title } : null,
    nextSalah: nextGuide ? { slug: nextGuide.slug, title: nextGuide.title, minutes: nextGuide.estimatedMinutes } : null,
    nextStory: nextStory
      ? {
          slug: nextStory.slug,
          title: nextStory.title,
          collection: kindOf.get(nextStory.collectionSlug) ?? 'history',
          minutes: nextStory.chapters.find((c) => !state.storyProgress[nextStory.slug]?.completedChapterIds.includes(c.id))?.estimatedMinutes ?? 5,
        }
      : null,
    calendarVisitedRecently,
  };
}
