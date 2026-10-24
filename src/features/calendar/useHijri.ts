import { useMemo } from 'react';
import { nextOccurrence, toHijri, type HijriOptions, type Occurrence } from '@/domain/hijri/calendar';
import type { OccasionDate } from '@/data/content/repository';
import { useLearner } from '@/app/learner';
import { useOccasionDates } from '@/app/queries';

export function useHijriOptions(): HijriOptions {
  const { state } = useLearner();
  return state.preferences.hijri;
}

export function useTodayHijri() {
  const { today } = useLearner();
  const opts = useHijriOptions();
  return useMemo(() => ({ date: toHijri(today, opts), opts }), [today, opts]);
}

export interface UpcomingOccasion extends OccasionDate {
  occurrence: Occurrence;
}

export function useUpcomingOccasions(): { data: UpcomingOccasion[] | undefined; isLoading: boolean; isError: boolean; supported: boolean } {
  const { today } = useLearner();
  const opts = useHijriOptions();
  const dates = useOccasionDates();
  const supported = toHijri(today, opts) !== null;
  const data = useMemo(() => {
    if (!dates.data || !supported) return dates.data ? [] : undefined;
    return dates.data
      .map((o) => ({ ...o, occurrence: nextOccurrence(o.rule, today, opts) }))
      .filter((o): o is UpcomingOccasion => o.occurrence !== null)
      .sort((a, b) => a.occurrence.start.localeCompare(b.occurrence.start));
  }, [dates.data, today, opts, supported]);
  return { data, isLoading: dates.isLoading, isError: dates.isError, supported };
}
