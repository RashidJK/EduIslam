import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ChevronLeft, CircleCheck } from 'lucide-react';
import type { Story } from '@/domain/content/library';
import { evaluate, initialResponse, isResponseComplete, type Evaluation, type QuestionResponse } from '@/domain/lessons/evaluate';
import type { Question } from '@/domain/lessons/schema';
import { recordActivity, saveStoryProgress } from '@/domain/learner/actions';
import { Button, ButtonLink } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ContentSections } from '@/components/content/ContentSections';
import { ReviewDetails, SourceList } from '@/components/content/ReviewInfo';
import { NotFoundPage } from '@/features/errors/ErrorPages';
import { QuestionInput, QuestionPrompt } from '@/features/lesson/questions/QuestionView';
import { useLearner } from '@/app/learner';
import { useStory } from '@/app/queries';

export function StoryPage() {
  const { slug } = useParams();
  const story = useStory(slug);
  if (story.isLoading) return <LoadingState label="Loading story…" />;
  if (story.isError) return <ErrorState message="This story couldn’t be loaded." onRetry={() => story.refetch()} />;
  if (!story.data) return <NotFoundPage />;
  return <StoryReader key={story.data.id} story={story.data} />;
}

function KnowledgeCheck({ question }: { question: Question }) {
  const [response, setResponse] = useState<QuestionResponse | undefined>(() => initialResponse(question));
  const [result, setResult] = useState<Evaluation | null>(null);
  return (
    <div className="rounded-xl border border-line p-4">
      <QuestionPrompt question={question} />
      <QuestionInput question={question} response={response} onChange={setResponse} locked={Boolean(result)} evaluation={result} />
      <div aria-live="polite">
        {result ? (
          <p className="mt-3 text-sm">
            <span className="font-semibold">{result.headline}.</span> {result.explanation}
          </p>
        ) : (
          <Button size="sm" className="mt-3" disabled={!isResponseComplete(question, response)} onClick={() => response && setResult(evaluate(question, response))}>
            Check
          </Button>
        )}
      </div>
    </div>
  );
}

function StoryReader({ story }: { story: Story }) {
  const { state, update } = useLearner();
  const [params, setParams] = useSearchParams();
  const progress = state.storyProgress[story.slug];
  const requested = story.chapters.find((c) => c.id === params.get('chapter'));
  const chapter = requested ?? story.chapters.find((c) => c.id === progress?.chapterId) ?? story.chapters[0]!;
  const index = story.chapters.indexOf(chapter);
  const next = story.chapters[index + 1];
  const read = new Set(progress?.completedChapterIds ?? []);

  // Remember the chapter being read so the learner can resume later.
  useEffect(() => {
    update(['stories'], (s, now) => (s.storyProgress[story.slug]?.chapterId === chapter.id ? s : saveStoryProgress(s, { storySlug: story.slug, chapterId: chapter.id }, now)));
  }, [chapter.id, story.slug, update]);

  const markRead = () => {
    update(['stories', 'activity', 'plans'], (s, now) =>
      recordActivity(saveStoryProgress(s, { storySlug: story.slug, chapterId: next?.id ?? chapter.id, completedChapterId: chapter.id }, now), { type: 'story', ref: story.slug, minutes: chapter.estimatedMinutes }, now),
    );
    if (next) setParams({ chapter: next.id });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/stories" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" /> Stories
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{story.title}</h1>
      <p className="mt-1 text-muted">{story.summary}</p>
      {story.notice && <p className="mt-2 text-sm text-muted">{story.notice}</p>}

      <nav aria-label="Chapters" className="mt-5">
        <ol className="flex flex-wrap gap-2">
          {story.chapters.map((c, i) => (
            <li key={c.id}>
              <Link
                to={`?chapter=${c.id}`}
                aria-current={c.id === chapter.id ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium',
                  c.id === chapter.id ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface hover:bg-surface-2',
                )}
              >
                {read.has(c.id) && <CircleCheck aria-hidden className="size-3.5" />}
                {i + 1}. {c.title}
                {read.has(c.id) && <span className="sr-only">, read</span>}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <article className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-7" aria-labelledby="chapter-title">
        <p className="text-sm text-muted">
          Chapter {index + 1} of {story.chapters.length} · {chapter.estimatedMinutes} min
        </p>
        <h2 id="chapter-title" className="mt-1 text-xl font-semibold">
          {chapter.title}
        </h2>
        <div className="mt-5">
          <ContentSections sections={chapter.sections} sources={story.sources} />
        </div>
        {chapter.keyLessons.length > 0 && (
          <section className="mt-6" aria-labelledby="lessons-title">
            <h3 id="lessons-title" className="font-semibold">
              Reflections
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {chapter.keyLessons.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        )}
        {chapter.check && chapter.check.length > 0 && (
          <section className="mt-6 space-y-3" aria-labelledby="check-title">
            <h3 id="check-title" className="font-semibold">
              Check your understanding
            </h3>
            {chapter.check.map((q) => (
              <KnowledgeCheck key={q.id} question={q} />
            ))}
          </section>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {read.has(chapter.id) ? (
            next ? (
              <ButtonLink to={`?chapter=${next.id}`}>Next chapter</ButtonLink>
            ) : (
              <p className="text-sm font-medium text-success">You’ve read every chapter.</p>
            )
          ) : (
            <Button onClick={markRead}>{next ? 'Mark as read and continue' : 'Mark as read'}</Button>
          )}
        </div>
      </article>

      <section aria-labelledby="story-sources" className="mt-10">
        <h2 id="story-sources" className="text-lg font-semibold">
          Sources and review
        </h2>
        <div className="mt-3">
          <SourceList sources={story.sources} />
        </div>
        <div className="mt-4">
          <ReviewDetails item={story} />
        </div>
      </section>
    </div>
  );
}
