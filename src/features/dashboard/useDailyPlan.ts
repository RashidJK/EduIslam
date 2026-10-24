import { useCallback, useEffect, useMemo } from 'react';
import { editPlan, setPlan, type PlanEdit } from '@/domain/learner/actions';
import { alternativeFor, generateDailyPlan } from '@/domain/plan/engine';
import { useLearner } from '@/app/learner';
import { useCourses, useDuas, useLessons, useSalahGuides, useStories, useStoryCollections } from '@/app/queries';
import { buildPlanContext } from './planContext';

/** Today's plan: generated on first visit each day, then persisted and editable. */
export function useDailyPlan() {
  const { state, today, now, update } = useLearner();
  const queries = [useCourses(), useLessons(), useDuas(), useSalahGuides(), useStories(), useStoryCollections()] as const;
  const [courses, lessons, duas, guides, stories, collections] = queries;
  const error = queries.find((q) => q.isError)?.error ?? null;
  const ready = queries.every((q) => q.isSuccess);

  const ctx = useMemo(() => {
    if (!ready) return null;
    return buildPlanContext(
      state,
      {
        courses: courses.data!,
        lessons: lessons.data!,
        duas: duas.data!,
        salahGuides: guides.data!,
        stories: stories.data!,
        storyCollections: collections.data!,
      },
      now(),
      today,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a stable clock; recompute when state/content change.
  }, [ready, state, courses.data, lessons.data, duas.data, guides.data, stories.data, collections.data, today]);

  const plan = state.plans[today];

  useEffect(() => {
    if (ctx && !plan) update(['plans'], (s) => (s.plans[ctx.today] ? s : setPlan(s, generateDailyPlan(ctx))));
  }, [ctx, plan, update]);

  const edit = useCallback(
    (e: PlanEdit) => update(['plans'], (s) => (s.plans[today] ? setPlan(s, editPlan(s.plans[today], e)) : s)),
    [update, today],
  );

  const swap = useCallback(
    (itemId: string) => {
      if (!ctx || !plan) return false;
      const alt = alternativeFor(plan, itemId, ctx);
      if (!alt) return false;
      edit({ kind: 'replace', itemId, replacement: alt });
      return true;
    },
    [ctx, plan, edit],
  );

  const regenerate = useCallback(() => {
    if (ctx) update(['plans'], (s) => setPlan(s, generateDailyPlan(ctx)));
  }, [ctx, update]);

  return { plan, ctx, loading: !ready && !error, error, edit, swap, regenerate };
}
