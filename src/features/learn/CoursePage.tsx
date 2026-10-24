import { Link, useParams } from 'react-router';
import { ArrowLeft, CircleCheck, CircleDot, Circle, Clock } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ReviewBadge, ReviewDetails, SourceList } from '@/components/content/ReviewInfo';
import { NotFoundPage } from '@/features/errors/ErrorPages';
import { useLearner } from '@/app/learner';
import { useCourse, useLessons } from '@/app/queries';
import { courseProgress } from './courseProgress';

export function CoursePage() {
  const { courseSlug } = useParams();
  const { state } = useLearner();
  const course = useCourse(courseSlug);
  const lessons = useLessons(courseSlug);

  if (course.isLoading || lessons.isLoading) return <LoadingState label="Loading course…" />;
  if (course.isError || lessons.isError) return <ErrorState message="This course couldn’t be loaded." onRetry={() => course.refetch()} />;
  if (!course.data) return <NotFoundPage />;

  const c = course.data;
  const byId = new Map((lessons.data ?? []).map((l) => [l.id, l]));
  const p = courseProgress(c, state);
  const next = p.nextId ? byId.get(p.nextId) : undefined;

  return (
    <div className="max-w-3xl">
      <Link to={c.area === 'knowledge' ? '/knowledge' : '/learn'} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" /> {c.area === 'knowledge' ? 'Islamic Knowledge' : 'Learn'}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <ReviewBadge item={c} />
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{c.title}</h1>
      <p className="mt-2 text-muted">{c.summary}</p>
      {c.notice && (
        <Notice tone="info" className="mt-4">
          {c.notice}
        </Notice>
      )}

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-48 flex-1">
            <p className="mb-1.5 text-sm text-muted">
              {p.completed} of {p.total} lessons completed · about {c.estimatedMinutes} minutes in total
            </p>
            <ProgressBar value={p.completed} max={p.total} label="Course progress" valueText={`${p.completed} of ${p.total} lessons completed`} />
          </div>
          {next && <ButtonLink to={`/lesson/${next.id}`}>{p.started ? (p.completed === p.total ? 'Review course' : 'Continue') : 'Start course'}</ButtonLink>}
        </div>
        {c.objectives.length > 0 && (
          <>
            <h2 className="mt-5 text-sm font-semibold">You will</h2>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted">
              {c.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {c.modules.map((m) => (
        <section key={m.id} aria-labelledby={`module-${m.id}`} className="mt-8">
          <h2 id={`module-${m.id}`} className="mb-3 text-lg font-semibold">
            {m.title}
          </h2>
          <ol className="space-y-2">
            {m.lessonIds.map((id, i) => {
              const lesson = byId.get(id);
              if (!lesson) return null;
              const status = state.lessons[id]?.status;
              const Icon = status === 'completed' ? CircleCheck : status === 'in-progress' ? CircleDot : Circle;
              return (
                <li key={id}>
                  <Link to={`/lesson/${id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 hover:border-line-strong">
                    <Icon aria-hidden className={status === 'completed' ? 'size-5 text-success' : 'size-5 text-muted'} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {i + 1}. {lesson.title}
                        <span className="sr-only">{status === 'completed' ? ', completed' : status === 'in-progress' ? ', in progress' : ', not started'}</span>
                      </span>
                      <span className="block text-sm text-muted">{lesson.summary}</span>
                    </span>
                    <span className="text-sm text-muted">
                      <Clock aria-hidden className="mr-1 inline size-3.5" />
                      {lesson.estimatedMinutes} min
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <section aria-labelledby="about-course" className="mt-10">
        <h2 id="about-course" className="mb-2 text-lg font-semibold">
          About this course
        </h2>
        <ReviewDetails item={c} />
        <div className="mt-3">
          <SourceList sources={c.sources} />
        </div>
      </section>
    </div>
  );
}
