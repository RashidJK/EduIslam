import { Link } from 'react-router';
import { CircleCheck } from 'lucide-react';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ReviewBadge } from '@/components/content/ReviewInfo';
import { useLearner } from '@/app/learner';
import { useCourses, useSalahGuides, useSalahPaths } from '@/app/queries';
import { CourseCard } from '@/features/learn/CourseCard';
import { PRACTICE_LABELS } from './practice';

export function SalahPage() {
  const { state } = useLearner();
  const paths = useSalahPaths();
  const guides = useSalahGuides();
  const courses = useCourses();

  if (paths.isLoading || guides.isLoading) return <LoadingState label="Loading Salah learning…" />;
  if (paths.isError || guides.isError) return <ErrorState message="Salah learning couldn’t be loaded." onRetry={() => guides.refetch()} />;
  const salahCourses = courses.data?.filter((c) => c.area === 'salah' || c.category === 'salah') ?? [];

  return (
    <div>
      <PageHeader title="Salah" description="Learn how to pray step by step, and understand the words you say." />
      <Notice tone="info" className="mb-6">
        Some details of prayer differ between the recognized schools of jurisprudence. Each guide states which school it follows and notes where others differ.
      </Notice>

      {salahCourses.length > 0 && (
        <section aria-labelledby="salah-courses" className="mb-8">
          <h2 id="salah-courses" className="mb-3 text-lg font-semibold">
            Courses
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {salahCourses.map((c) => (
              <li key={c.id}>
                <CourseCard course={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mb-3 text-lg font-semibold">Learning paths</h2>
      <ol className="space-y-3">
        {paths.data!.map((p, i) => {
          const list = guides.data!.filter((g) => g.pathSlug === p.slug);
          return (
            <li key={p.slug} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-sm text-muted">{p.summary}</p>
                  {list.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">In preparation — guides open here once they have been written and reviewed with sources.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {list.map((g) => {
                        const progress = state.salahProgress[g.slug];
                        return (
                          <li key={g.id}>
                            <Link to={`/salah/${g.slug}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3 hover:border-line-strong">
                              {progress?.completed && <CircleCheck aria-label="Completed" className="size-4 text-success" />}
                              <span className="font-medium">{g.title}</span>
                              <span className="text-xs text-muted">{PRACTICE_LABELS[g.practiceType]}</span>
                              <span className="ml-auto">
                                <ReviewBadge item={g} />
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
