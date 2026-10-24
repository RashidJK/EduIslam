import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, type createBrowserRouter } from 'react-router';
import { AudioProvider } from '@/features/audio/AudioProvider';
import type { AudioElementLike } from '@/features/audio/controller';
import { AccountProvider, type AccountApi } from './account';
import { LearnerGate } from './learner';
import { ServicesProvider, useServices, type AppServices } from './services';

// Remount the learner gate whenever the store changes (e.g. on sign-in) so data reloads.
const storeKeys = new WeakMap<object, number>();
let nextKey = 0;
function KeyedLearnerGate({ children }: { children: ReactNode }) {
  const { learnerStore } = useServices();
  if (!storeKeys.has(learnerStore)) storeKeys.set(learnerStore, nextKey++);
  return <LearnerGate key={storeKeys.get(learnerStore)}>{children}</LearnerGate>;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
  });
}

export function AppProviders({
  services,
  children,
  queryClient,
  createAudioElement,
  account,
}: {
  services: AppServices;
  children: ReactNode;
  queryClient?: QueryClient;
  createAudioElement?: () => AudioElementLike;
  /** Test hook: supply account state instead of connecting to a backend. */
  account?: AccountApi;
}) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <ServicesProvider services={services}>
        <AccountProvider override={account}>
          <KeyedLearnerGate>
            <AudioProvider createElement={createAudioElement}>{children}</AudioProvider>
          </KeyedLearnerGate>
        </AccountProvider>
      </ServicesProvider>
    </QueryClientProvider>
  );
}

export function App({ services, router }: { services: AppServices; router: ReturnType<typeof createBrowserRouter> }) {
  return (
    <AppProviders services={services}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
