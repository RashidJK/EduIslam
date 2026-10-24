// Data hooks. Content and Quran text are cached by React Query; each hook exposes
// loading and error states for the UI to render honestly.
import { useQuery } from '@tanstack/react-query';
import { useServices } from './services';

const STATIC = { staleTime: Infinity, gcTime: 30 * 60_000 } as const;

export function useCourses() {
  const { content } = useServices();
  return useQuery({ queryKey: ['courses'], queryFn: () => content.listCourses(), ...STATIC });
}

export function useCourse(slug: string | undefined) {
  const { content } = useServices();
  return useQuery({ queryKey: ['course', slug], queryFn: () => content.getCourse(slug!), enabled: Boolean(slug), ...STATIC });
}

export function useLessons(courseSlug?: string) {
  const { content } = useServices();
  return useQuery({ queryKey: ['lessons', courseSlug ?? '*'], queryFn: () => content.listLessons(courseSlug), ...STATIC });
}

export function useLesson(id: string | undefined) {
  const { content } = useServices();
  return useQuery({ queryKey: ['lesson', id], queryFn: () => content.getLesson(id!), enabled: Boolean(id), ...STATIC });
}

export function useDuaCategories() {
  const { content } = useServices();
  return useQuery({ queryKey: ['duaCategories'], queryFn: () => content.listDuaCategories(), ...STATIC });
}

export function useDuas() {
  const { content } = useServices();
  return useQuery({ queryKey: ['duas'], queryFn: () => content.listDuas(), ...STATIC });
}

export function useDua(slug: string | undefined) {
  const { content } = useServices();
  return useQuery({ queryKey: ['dua', slug], queryFn: () => content.getDua(slug!), enabled: Boolean(slug), ...STATIC });
}

export function useSalahPaths() {
  const { content } = useServices();
  return useQuery({ queryKey: ['salahPaths'], queryFn: () => content.listSalahPaths(), ...STATIC });
}

export function useSalahGuides() {
  const { content } = useServices();
  return useQuery({ queryKey: ['salahGuides'], queryFn: () => content.listSalahGuides(), ...STATIC });
}

export function useSalahGuide(slug: string | undefined) {
  const { content } = useServices();
  return useQuery({ queryKey: ['salahGuide', slug], queryFn: () => content.getSalahGuide(slug!), enabled: Boolean(slug), ...STATIC });
}

export function useStoryCollections() {
  const { content } = useServices();
  return useQuery({ queryKey: ['storyCollections'], queryFn: () => content.listStoryCollections(), ...STATIC });
}

export function useStories() {
  const { content } = useServices();
  return useQuery({ queryKey: ['stories'], queryFn: () => content.listStories(), ...STATIC });
}

export function useStory(slug: string | undefined) {
  const { content } = useServices();
  return useQuery({ queryKey: ['story', slug], queryFn: () => content.getStory(slug!), enabled: Boolean(slug), ...STATIC });
}

export function useOccasionDates() {
  const { content } = useServices();
  return useQuery({ queryKey: ['occasionDates'], queryFn: () => content.listOccasionDates(), ...STATIC });
}

export function useOccasionContent(slug: string | undefined) {
  const { content } = useServices();
  return useQuery({ queryKey: ['occasion', slug], queryFn: () => content.getOccasionContent(slug!), enabled: Boolean(slug), ...STATIC });
}

export function useSurah(surah: number | undefined, translation: boolean) {
  const { quran } = useServices();
  return useQuery({
    queryKey: ['surah', quran.id, surah, translation],
    queryFn: ({ signal }) => quran.getSurah(surah!, { translation, signal }),
    enabled: surah !== undefined,
    ...STATIC,
    retry: (count, err) => count < 2 && (err as { kind?: string })?.kind === 'network',
  });
}

export function useSurahAudio(surah: number | undefined, reciterId: string, enabled: boolean) {
  const { quran } = useServices();
  return useQuery({
    queryKey: ['surahAudio', quran.id, surah, reciterId],
    queryFn: ({ signal }) => quran.getSurahAudio(surah!, reciterId, { signal }),
    enabled: enabled && surah !== undefined,
    ...STATIC,
    retry: 1,
  });
}
