import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { recordActivity, recordListening } from '@/domain/learner/actions';
import { useServices } from '@/app/services';
import { AudioController, type AudioElementLike, type PlayerSnapshot } from './controller';

const AudioContext = createContext<AudioController | null>(null);

export function AudioProvider({ children, createElement }: { children: ReactNode; createElement?: () => AudioElementLike }) {
  const { quran, learnerStore } = useServices();
  const queryClient = useQueryClient();

  const controller = useMemo(
    () =>
      new AudioController({
        createElement: createElement ?? (() => new Audio()),
        loadSurahAudio: (surah, reciterId) =>
          queryClient.fetchQuery({
            queryKey: ['surahAudio', quran.id, surah, reciterId],
            queryFn: () => quran.getSurahAudio(surah, reciterId),
            staleTime: Infinity,
          }),
        onVerseStart: (info) => {
          if (learnerStore.getSnapshot().state) learnerStore.update(['listening'], (s, now) => recordListening(s, info, now));
        },
        onListened: ({ surah, seconds }) => {
          if (learnerStore.getSnapshot().state) {
            learnerStore.update(['activity', 'plans'], (s, now) => recordActivity(s, { type: 'listening', ref: String(surah), minutes: seconds / 60 }, now));
          }
        },
      }),
    [quran, queryClient, learnerStore, createElement],
  );

  useEffect(() => () => controller.stop(), [controller]);

  return <AudioContext.Provider value={controller}>{children}</AudioContext.Provider>;
}

export function useAudioController(): AudioController {
  const c = useContext(AudioContext);
  if (!c) throw new Error('useAudioController must be used inside AudioProvider');
  return c;
}

export function useAudio(): PlayerSnapshot & { controller: AudioController } {
  const controller = useAudioController();
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  return { ...snapshot, controller };
}

/** The verse currently playing, if any — used by readers to highlight it. */
export function usePlayingVerse(): { surah: number; verse: number } | null {
  const { track, index, status } = useAudio();
  if (!track || status === 'idle') return null;
  const v = track.verses[index];
  return v ? { surah: track.surah, verse: v.verse } : null;
}
