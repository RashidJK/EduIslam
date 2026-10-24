import { createContext, useContext, type ReactNode } from 'react';
import { env, isSupabaseConfigured } from '@/config/env';
import { bundledContent, bundledPacks } from '@/data/content/bundled';
import { loadSupabase } from '@/data/supabase/client';
import { createRemoteContentRepository } from '@/data/supabase/remoteContent';
import type { ContentRepository } from '@/data/content/repository';
import { createLocalLearnerRepository } from '@/data/learner/localRepository';
import { LearnerStore } from '@/data/learner/store';
import { createAlQuranCloudProvider } from '@/data/quran/alquranCloud';
import type { QuranProvider } from '@/data/quran/provider';
import { systemClock, type Clock } from '@/domain/time';

/** External dependencies, injected so tests and future backends can swap them. */
export interface AppServices {
  content: ContentRepository;
  quran: QuranProvider;
  learnerStore: LearnerStore;
  clock: Clock;
}

const ServicesContext = createContext<AppServices | null>(null);

export function createDefaultServices(clock: Clock = systemClock): AppServices {
  // With a backend, published CMS content is layered over the bundled packs.
  const content = isSupabaseConfigured
    ? createRemoteContentRepository({
        bundled: bundledPacks,
        fetchPublishedRows: async () => {
          const client = await loadSupabase()!;
          // Learners read through a view that exposes only published rows and safe columns.
          const { data, error } = await client.from('published_content').select('*');
          if (error) throw error;
          return data ?? [];
        },
        onError: (err) => console.warn('CMS content unavailable; using bundled content.', err),
      })
    : bundledContent;
  return {
    content,
    quran: createAlQuranCloudProvider({ apiBase: env.VITE_QURAN_API_BASE }),
    learnerStore: new LearnerStore(createLocalLearnerRepository(clock), clock),
    clock,
  };
}

export function ServicesProvider({ services, children }: { services: AppServices; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const s = useContext(ServicesContext);
  if (!s) throw new Error('useServices must be used inside ServicesProvider');
  return s;
}
