import type { LearnerState } from '@/domain/learner/schema';
import type { Course } from '@/domain/lessons/schema';

export function courseProgress(course: Course, state: LearnerState) {
  const ids = course.modules.flatMap((m) => m.lessonIds);
  const completed = ids.filter((id) => state.lessons[id]?.status === 'completed').length;
  const inProgressId = ids.find((id) => state.lessons[id]?.status === 'in-progress');
  const nextId = inProgressId ?? ids.find((id) => state.lessons[id]?.status !== 'completed') ?? ids[0];
  return { total: ids.length, completed, nextId, started: completed > 0 || Boolean(inProgressId) };
}
