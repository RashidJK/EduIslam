import { Outlet, type RouteObject } from 'react-router';
import { LoadingState } from '@/components/ui/States';
import { NotFoundPage, RouteErrorPage } from '@/features/errors/ErrorPages';
import { AppShell } from './layout/AppShell';
import { PreferenceEffects } from './learner';

function Root() {
  return (
    <>
      <PreferenceEffects />
      <Outlet />
    </>
  );
}

// Each page is code-split so the first load stays small on slow connections.
const page = <M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M) => ({
  lazy: async () => ({ Component: (await load())[name] as React.ComponentType }),
});

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Root />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <LoadingState className="min-h-dvh" />,
    children: [
      { index: true, ...page(() => import('@/features/landing/LandingPage'), 'LandingPage') },
      { path: 'onboarding', ...page(() => import('@/features/onboarding/OnboardingPage'), 'OnboardingPage') },
      {
        element: <AppShell />,
        children: [
          { path: 'app', ...page(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage') },
          { path: 'learn', ...page(() => import('@/features/learn/LearnPage'), 'LearnPage') },
          { path: 'learn/:courseSlug', ...page(() => import('@/features/learn/CoursePage'), 'CoursePage') },
          { path: 'lesson/:lessonId', ...page(() => import('@/features/lesson/LessonPage'), 'LessonPage') },
          { path: 'quran', ...page(() => import('@/features/quran/QuranIndexPage'), 'QuranIndexPage') },
          { path: 'quran/bookmarks', ...page(() => import('@/features/quran/BookmarksPage'), 'BookmarksPage') },
          { path: 'quran/:surahNumber', ...page(() => import('@/features/quran/SurahReaderPage'), 'SurahReaderPage') },
          { path: 'memorization', ...page(() => import('@/features/memorization/MemorizationPage'), 'MemorizationPage') },
          { path: 'memorization/new', ...page(() => import('@/features/memorization/NewMemorizationPage'), 'NewMemorizationPage') },
          { path: 'memorization/:itemId', ...page(() => import('@/features/memorization/MemorizationSessionPage'), 'MemorizationSessionPage') },
          { path: 'listening', ...page(() => import('@/features/listening/ListeningPage'), 'ListeningPage') },
          { path: 'duas', ...page(() => import('@/features/duas/DuasPage'), 'DuasPage') },
          { path: 'duas/:slug', ...page(() => import('@/features/duas/DuaDetailPage'), 'DuaDetailPage') },
          { path: 'salah', ...page(() => import('@/features/salah/SalahPage'), 'SalahPage') },
          { path: 'salah/:slug', ...page(() => import('@/features/salah/SalahGuidePage'), 'SalahGuidePage') },
          { path: 'stories', ...page(() => import('@/features/stories/StoriesPage'), 'StoriesPage') },
          { path: 'stories/:slug', ...page(() => import('@/features/stories/StoryPage'), 'StoryPage') },
          { path: 'calendar', ...page(() => import('@/features/calendar/CalendarPage'), 'CalendarPage') },
          { path: 'calendar/months/:month', ...page(() => import('@/features/calendar/MonthPage'), 'MonthPage') },
          { path: 'calendar/:slug', ...page(() => import('@/features/calendar/OccasionPage'), 'OccasionPage') },
          { path: 'knowledge', ...page(() => import('@/features/knowledge/KnowledgePage'), 'KnowledgePage') },
          { path: 'progress', ...page(() => import('@/features/progress/ProgressPage'), 'ProgressPage') },
          { path: 'settings', ...page(() => import('@/features/settings/SettingsPage'), 'SettingsPage') },
          { path: 'sources', ...page(() => import('@/features/sources/SourcesPage'), 'SourcesPage') },
          { path: 'admin', ...page(() => import('@/features/admin/AdminPage'), 'AdminPage') },
          { path: 'search', ...page(() => import('@/features/search/SearchPage'), 'SearchPage') },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
