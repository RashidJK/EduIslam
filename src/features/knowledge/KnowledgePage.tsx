import { Library } from 'lucide-react';
import { knowledgeAreas } from '@/content/library';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useCourses } from '@/app/queries';
import { CourseCard } from '@/features/learn/CourseCard';

export function KnowledgePage() {
  const courses = useCourses();
  return (
    <div>
      <PageHeader title="Islamic Knowledge" description="Foundational learning, organized by topic. Every course lists its sources and reviewer." />
      <Notice tone="info" className="mb-6">
        For questions about your own circumstances, please consult a qualified scholar. Where schools of thought differ, courses say so and attribute each view.
      </Notice>
      {courses.isLoading && <LoadingState />}
      {courses.isError && <ErrorState message="Courses couldn’t be loaded." onRetry={() => courses.refetch()} />}
      {courses.data &&
        knowledgeAreas.map((area) => {
          const list = courses.data.filter((c) => c.area === 'knowledge' && c.category === area.category);
          return (
            <Section key={area.category} title={area.title} id={area.category}>
              {list.length === 0 ? (
                <p className="flex items-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface/60 px-4 py-3 text-sm text-muted">
                  <Library aria-hidden className="size-4 shrink-0" />
                  No reviewed courses yet. This topic opens once its lessons have been written and checked against sources.
                </p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {list.map((c) => (
                    <li key={c.id}>
                      <CourseCard course={c} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          );
        })}
    </div>
  );
}
