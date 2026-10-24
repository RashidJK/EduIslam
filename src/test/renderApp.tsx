import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders, createQueryClient } from '@/app/App';
import type { AccountApi } from '@/app/account';
import { routes } from '@/app/routes';
import type { AppServices } from '@/app/services';
import { bundledContent } from '@/data/content/bundled';
import { buildCatalog, type ContentPacks } from '@/data/content/catalog';
import { createCatalogRepository } from '@/data/content/repository';
import { createLocalLearnerRepository } from '@/data/learner/localRepository';
import { LearnerStore } from '@/data/learner/store';
import type { QuranProvider } from '@/data/quran/provider';
import { completeOnboarding } from '@/domain/learner/actions';
import { createInitialLearnerState, type LearnerState } from '@/domain/learner/schema';
import type { AudioElementLike } from '@/features/audio/controller';
import { LEARNER_STORAGE_KEY } from '@/data/learner/localRepository';
import { createFakeQuranProvider } from './fakeQuran';

export const TEST_NOW = new Date('2026-03-04T09:00:00Z');

export class SilentAudio extends EventTarget implements AudioElementLike {
  src = '';
  currentTime = 0;
  duration = 5;
  playbackRate = 1;
  paused = true;
  played: string[] = [];
  async play() {
    this.paused = false;
    this.played.push(this.src);
    this.dispatchEvent(new Event('playing'));
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
  load() {}
}

/** Seeds stored learner data, as if the learner had used the app before. */
export function seedLearner(recipe: (s: LearnerState) => LearnerState = (s) => s) {
  const s = recipe(createInitialLearnerState(TEST_NOW, 'UTC'));
  localStorage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(s));
  return s;
}

export function seedOnboarded(goals: LearnerState['preferences']['goals'] = ['quran-reading', 'arabic-reading'], extra: (s: LearnerState) => LearnerState = (s) => s) {
  return seedLearner((s) =>
    extra(completeOnboarding(s, { goals, dailyMinutes: 15, quranReadingLevel: null, memorizationStage: null, reminder: { enabled: false, time: '19:00' } }, TEST_NOW)),
  );
}

export function renderApp(
  path: string,
  opts: { packs?: ContentPacks; quran?: QuranProvider; now?: () => Date; account?: AccountApi } = {},
) {
  const clock = opts.now ?? (() => TEST_NOW);
  const audio = new SilentAudio();
  const services: AppServices = {
    content: opts.packs ? createCatalogRepository(buildCatalog(opts.packs), 'test') : bundledContent,
    quran: opts.quran ?? createFakeQuranProvider(),
    learnerStore: new LearnerStore(createLocalLearnerRepository(clock), clock),
    clock,
  };
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const utils = render(
    <AppProviders services={services} queryClient={createQueryClient()} createAudioElement={() => audio} account={opts.account}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  const stored = () => JSON.parse(localStorage.getItem(LEARNER_STORAGE_KEY) ?? 'null') as LearnerState | null;
  return { ...utils, user, router, services, audio, stored };
}
