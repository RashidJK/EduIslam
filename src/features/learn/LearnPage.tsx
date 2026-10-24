import { GraduationCap } from 'lucide-react';
import { LinkCard } from '@/components/ui/Card';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useCourses } from '@/app/queries';
import { CourseCard } from './CourseCard';

const LEARN_PATHS = [
  { category: 'quran-meaning', title: 'Quran vocabulary and meaning' },
  { category: 'salah', title: 'The words of Salah' },
] as const;

export function LearnPage() {
  const courses = useCourses();
  const learn = courses.data?.filter((c) => c.area === 'learn') ?? [];

  return (
    <div>
      <PageHeader title="Learn" description="Short lessons with practice and explanations. Pick any course — there is no fixed order." />
      {courses.isLoading && <LoadingState label="Loading courses…" />}
      {courses.isError && <ErrorState message="Courses couldn’t be loaded." onRetry={() => courses.refetch()} />}
      {courses.data && (
        <>
          <Section title="Courses" id="courses">
            {learn.length === 0 ? (
              <EmptyState icon={<GraduationCap aria-hidden className="size-6" />} title="No courses yet">
                Courses appear here once they are published.
              </EmptyState>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {learn.map((c) => (
                  <li key={c.id}>
                    <CourseCard course={c} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Learning paths in preparation" id="paths" description="These paths will open when their lessons have been written and reviewed with sources.">
            <ul className="grid gap-3 sm:grid-cols-2">
              {LEARN_PATHS.filter((p) => !courses.data.some((c) => c.category === p.category)).map((p) => (
                <li key={p.category} className="rounded-2xl border border-dashed border-line-strong bg-surface/60 p-4">
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-0.5 text-sm text-muted">Awaiting reviewed content</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="More to explore" id="more">
            <ul className="grid gap-3 sm:grid-cols-2">
              <li>
                <LinkCard to="/knowledge" title="Islamic Knowledge" description="Foundational beliefs, pillars, character, and more" />
              </li>
              <li>
                <LinkCard to="/memorization" title="Memorization" description="Memorize and revise Quran passages" />
              </li>
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}
