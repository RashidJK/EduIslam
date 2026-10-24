// Learning statistics. These describe activity in this app only — they are never a
// measure of anyone's faith or worth, and the UI words them accordingly.
import type { LearnerState } from '../learner/schema';
import type { Course } from '../lessons/schema';
import { deriveMemorizationStatus, MEMORIZATION_STATUSES, type MemorizationStatus } from '../memorization/status';
import { isDue } from '../srs/scheduler';
import { weekOf, type LocalDateKey } from '../time';

export interface DayActivity {
  date: LocalDateKey;
  minutes: number;
  active: boolean;
}

export function weeklyActivity(state: LearnerState, today: LocalDateKey): DayActivity[] {
  return weekOf(today).map((date) => {
    const day = state.activity[date];
    const minutes = day ? Math.round(day.minutes) : 0;
    return { date, minutes, active: Boolean(day && day.records.length > 0) };
  });
}

export function totalMinutes(state: LearnerState): number {
  return Math.round(Object.values(state.activity).reduce((s, d) => s + d.minutes, 0));
}

export function activeDayCount(state: LearnerState): number {
  return Object.values(state.activity).filter((d) => d.records.length > 0).length;
}

export function minutesToday(state: LearnerState, today: LocalDateKey): number {
  return Math.round(state.activity[today]?.minutes ?? 0);
}

export function memorizationCounts(state: LearnerState): Record<MemorizationStatus, number> {
  const counts = Object.fromEntries(MEMORIZATION_STATUSES.map((s) => [s, 0])) as Record<MemorizationStatus, number>;
  for (const item of state.memorization) {
    if (item.archived) continue;
    counts[deriveMemorizationStatus(item.srs, item.history)] += 1;
  }
  return counts;
}

export function lessonsCompleted(state: LearnerState): number {
  return Object.values(state.lessons).filter((l) => l.status === 'completed').length;
}

/** Lesson completions recorded during the current Monday-start week (repeats count). */
export function lessonsCompletedThisWeek(state: LearnerState, today: LocalDateKey): number {
  return weekOf(today).reduce((n, d) => n + (state.activity[d]?.records.filter((r) => r.type === 'lesson').length ?? 0), 0);
}

export function coursesCompleted(state: LearnerState, courses: readonly Course[]): Course[] {
  return courses.filter((c) => {
    const ids = c.modules.flatMap((m) => m.lessonIds);
    return ids.length > 0 && ids.every((id) => state.lessons[id]?.status === 'completed');
  });
}

export function surahsCompleted(state: LearnerState): number {
  return Object.values(state.reading.surahs).filter((s) => s.completedOn).length;
}

export function revisionDueCount(state: LearnerState, today: LocalDateKey): number {
  return (
    state.memorization.filter((m) => !m.archived && isDue(m.srs, today)).length +
    Object.values(state.duas).filter((d) => isDue(d.srs, today)).length
  );
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}

export function achievements(state: LearnerState, courses: readonly Course[]): Achievement[] {
  const memo = memorizationCounts(state);
  const reviewed = state.memorization.some((m) => m.history.length > 0) || Object.values(state.duas).some((d) => d.history.length > 0);
  return [
    { id: 'first-lesson', title: 'First lesson', description: 'Completed your first lesson.', earned: lessonsCompleted(state) > 0 },
    { id: 'seven-days', title: 'A week of learning', description: 'Learned on seven different days.', earned: activeDayCount(state) >= 7 },
    { id: 'course', title: 'Course completed', description: 'Finished every lesson in a course.', earned: coursesCompleted(state, courses).length > 0 },
    { id: 'revision', title: 'First revision session', description: 'Completed a revision review.', earned: reviewed },
    { id: 'reading', title: 'Reading milestone', description: 'Read a surah through to its last verse.', earned: surahsCompleted(state) > 0 },
    { id: 'memorization', title: 'Memorization milestone', description: 'A passage reached "consistently recalled".', earned: memo['consistently-recalled'] > 0 },
  ];
}
