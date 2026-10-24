import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, PartyPopper, RotateCcw } from 'lucide-react';
import { completeLesson, saveLessonStep, startLesson } from '@/domain/learner/actions';
import { ButtonLink, Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ReviewBadge, ReviewDetails, SourceList } from '@/components/content/ReviewInfo';
import { NotFoundPage } from '@/features/errors/ErrorPages';
import { useLearner } from '@/app/learner';
import { useCourse, useLesson, useLessons } from '@/app/queries';
import { LessonPlayer, type LessonResult } from './LessonPlayer';

export function LessonPage() {
  const { lessonId } = useParams();
  const lesson = useLesson(lessonId);
  if (lesson.isLoading) return <LoadingState label="Loading lesson…" />;
  if (lesson.isError) return <ErrorState message="This lesson couldn’t be loaded." onRetry={() => lesson.refetch()} />;
  if (!lesson.data) return <NotFoundPage />;
  return <LessonScreen key={lesson.data.id} lessonId={lesson.data.id} />;
}

function LessonScreen({ lessonId }: { lessonId: string }) {
  const { state, update } = useLearner();
  const lesson = useLesson(lessonId).data!;
  const course = useCourse(lesson.courseSlug).data;
  const siblings = useLessons(lesson.courseSlug).data;
  const progress = state.lessons[lesson.id];
  const [finished, setFinished] = useState<LessonResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Resume an unfinished attempt (captured once, on arrival); completed lessons start over.
  const [saved] = useState(() =>
    progress?.status === 'in-progress' && progress.stepIndex > 0
      ? { step: progress.stepIndex, result: { correct: progress.correct, scored: progress.scored } }
      : null,
  );
  const resume = Boolean(saved) && attempt === 0;
  const initialStep = resume ? saved!.step : 0;
  const initialResult = resume ? saved!.result : { correct: 0, scored: 0 };

  const nextLesson = useMemo(() => {
    const i = siblings?.findIndex((l) => l.id === lesson.id) ?? -1;
    return i >= 0 ? siblings![i + 1] : undefined;
  }, [siblings, lesson.id]);

  // Record the start (or a fresh practice attempt). The recipe is idempotent for a first start.
  useEffect(() => {
    update(['lessons'], (s, now) =>
      s.lessons[lesson.id] && attempt === 0 ? s : startLesson(s, { lessonId: lesson.id, courseSlug: lesson.courseSlug }, now),
    );
  }, [attempt, lesson.id, lesson.courseSlug, update]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link to={`/learn/${lesson.courseSlug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" />
          {course?.title ?? 'Back to course'}
        </Link>
        <ReviewBadge item={lesson} />
      </div>
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">{lesson.title}</h1>
      {lesson.notice && (
        <Notice tone="info" className="mb-5">
          {lesson.notice}
        </Notice>
      )}

      {finished ? (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center sm:p-8" role="status">
          <PartyPopper aria-hidden className="mx-auto size-10 text-gold" />
          <h2 className="mt-3 text-2xl font-semibold">Lesson complete</h2>
          {finished.scored > 0 ? (
            <p className="mt-2 text-muted">
              You answered {finished.correct} of {finished.scored} questions correctly. Each answer came with an explanation — revisit any time.
            </p>
          ) : (
            <p className="mt-2 text-muted">Well done for taking the time.</p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {nextLesson ? (
              <ButtonLink to={`/lesson/${nextLesson.id}`}>Next: {nextLesson.title}</ButtonLink>
            ) : (
              <ButtonLink to={`/learn/${lesson.courseSlug}`}>Back to course</ButtonLink>
            )}
            <ButtonLink to="/app" variant="secondary">
              Dashboard
            </ButtonLink>
            <Button
              variant="ghost"
              icon={<RotateCcw aria-hidden className="size-4" />}
              onClick={() => {
                setFinished(null);
                setAttempt((a) => a + 1);
              }}
            >
              Practise again
            </Button>
          </div>
        </div>
      ) : (
        <>
          {resume && (
            <p className="mb-3 text-sm text-muted" role="status">
              Resuming where you left off.
            </p>
          )}
          <LessonPlayer
            key={attempt}
            lesson={lesson}
            initialStep={initialStep}
            initialResult={initialResult}
            onProgress={(stepIndex, r) => update(['lessons'], (s, now) => saveLessonStep(s, { lessonId: lesson.id, stepIndex, correct: r.correct, scored: r.scored }, now))}
            onComplete={(r) => {
              update(['lessons', 'activity', 'plans'], (s, now) =>
                completeLesson(s, { lessonId: lesson.id, courseSlug: lesson.courseSlug, correct: r.correct, scored: r.scored, minutes: lesson.estimatedMinutes }, now),
              );
              setFinished(r);
            }}
          />
        </>
      )}

      <details className="mt-8 rounded-xl border border-line bg-surface p-4">
        <summary className="cursor-pointer font-medium">About this lesson</summary>
        <div className="mt-3 space-y-3">
          <ReviewDetails item={lesson} />
          <SourceList sources={lesson.sources} />
        </div>
      </details>
    </div>
  );
}
