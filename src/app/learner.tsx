import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { brand } from '@/config/brand';
import { todayKey } from '@/domain/learner/actions';
import { createInitialLearnerState, type LearnerState } from '@/domain/learner/schema';
import { detectTimeZone, type LocalDateKey } from '@/domain/time';
import type { LearnerArea } from '@/data/learner/repository';
import type { Recipe } from '@/data/learner/store';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { useServices } from './services';

/** Loads learner data once before rendering the app. */
export function LearnerGate({ children }: { children: ReactNode }) {
  const { learnerStore } = useServices();
  const snapshot = useSyncExternalStore(learnerStore.subscribe, learnerStore.getSnapshot);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (snapshot.status === 'loading') {
      learnerStore.load().catch((err: unknown) => {
        console.error(err);
        setError('Your learning data could not be loaded.');
      });
    }
  }, [learnerStore, snapshot.status]);

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} className="m-6" />;
  if (snapshot.status === 'loading' || !snapshot.state) return <LoadingState label={`Opening ${brand.shortName}…`} className="min-h-dvh" />;
  return <>{children}</>;
}

export interface LearnerApi {
  state: LearnerState;
  today: LocalDateKey;
  now: () => Date;
  update: (areas: readonly LearnerArea[], recipe: Recipe) => LearnerState;
  notice: string | null;
  saveError: string | null;
  dismissNotice: () => void;
  storageDescription: string;
  storageKind: 'local' | 'memory' | 'supabase';
  resetAll: () => Promise<void>;
}

export function useLearner(): LearnerApi {
  const { learnerStore, clock } = useServices();
  const snapshot = useSyncExternalStore(learnerStore.subscribe, learnerStore.getSnapshot);
  const state = snapshot.state;
  if (!state) throw new Error('useLearner used before learner data loaded');

  const update = useCallback<LearnerApi['update']>((areas, recipe) => learnerStore.update(areas, recipe), [learnerStore]);
  const resetAll = useCallback(async () => {
    await learnerStore.reset(createInitialLearnerState(clock(), detectTimeZone()));
  }, [learnerStore, clock]);

  // The local day is recomputed on each render so it rolls over at midnight.
  const today = todayKey(state, clock());

  return useMemo(
    () => ({
      state,
      today,
      now: clock,
      update,
      notice: snapshot.notice,
      saveError: snapshot.saveError,
      dismissNotice: () => learnerStore.dismissNotice(),
      storageDescription: learnerStore.repository.description,
      storageKind: learnerStore.repository.kind,
      resetAll,
    }),
    [state, today, clock, update, snapshot.notice, snapshot.saveError, learnerStore, resetAll],
  );
}

/** Applies display preferences (theme, Arabic size, reduced motion) to the document. */
export function PreferenceEffects() {
  const { state } = useLearner();
  const { theme, arabicScale, reduceMotion } = state.preferences.display;
  const [systemDark, setSystemDark] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    root.dataset.reduceMotion = String(reduceMotion);
    root.style.setProperty('--arabic-scale', String(arabicScale));
  }, [theme, systemDark, arabicScale, reduceMotion]);

  return null;
}
