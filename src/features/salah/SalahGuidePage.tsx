import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronLeft, ChevronRight, CircleCheck, Lightbulb, Play } from 'lucide-react';
import type { SalahGuide } from '@/domain/content/library';
import { recordActivity, saveSalahProgress } from '@/domain/learner/actions';
import { ArabicText } from '@/components/ui/ArabicText';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ReviewDetails, SourceList } from '@/components/content/ReviewInfo';
import { NotFoundPage } from '@/features/errors/ErrorPages';
import { useLearner } from '@/app/learner';
import { useSalahGuide } from '@/app/queries';
import { PRACTICE_LABELS } from './practice';

export function SalahGuidePage() {
  const { slug } = useParams();
  const guide = useSalahGuide(slug);
  if (guide.isLoading) return <LoadingState label="Loading guide…" />;
  if (guide.isError) return <ErrorState message="This guide couldn’t be loaded." onRetry={() => guide.refetch()} />;
  if (!guide.data) return <NotFoundPage />;
  return <Guide key={guide.data.id} guide={guide.data} />;
}

function Guide({ guide }: { guide: SalahGuide }) {
  const { state, update } = useLearner();
  const saved = state.salahProgress[guide.slug];
  const [index, setIndex] = useState(saved && !saved.completed ? Math.min(saved.stepIndex, guide.steps.length - 1) : 0);
  const [finished, setFinished] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const stepRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const step = guide.steps[index]!;
  const sourceOf = (id: string) => guide.sources.find((s) => s.id === id);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    stepRef.current?.focus();
  }, [index]);

  const go = (next: number) => {
    setIndex(next);
    setAudioError(false);
    update(['salah'], (s, now) => saveSalahProgress(s, { guideSlug: guide.slug, stepIndex: next }, now));
  };
  const complete = () => {
    update(['salah', 'activity', 'plans'], (s, now) =>
      recordActivity(saveSalahProgress(s, { guideSlug: guide.slug, stepIndex: 0, completed: true }, now), { type: 'salah', ref: guide.slug, minutes: guide.estimatedMinutes }, now),
    );
    setFinished(true);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/salah" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" /> Salah
      </Link>
      <div className="flex flex-wrap gap-2">
        <Badge tone="primary">{PRACTICE_LABELS[guide.practiceType]}</Badge>
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{guide.title}</h1>
      <p className="mt-1 text-muted">{guide.summary}</p>
      {guide.schoolNote && (
        <Notice tone="info" className="mt-4" title="About differences between schools">
          {guide.schoolNote}
        </Notice>
      )}

      {finished ? (
        <Card className="mt-6 text-center" role="status">
          <CircleCheck aria-hidden className="mx-auto size-10 text-success" />
          <h2 className="mt-2 text-xl font-semibold">Guide complete</h2>
          <p className="mt-1 text-muted">You can return to any step to revise it.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => { setFinished(false); go(0); }}>
              Review from the start
            </Button>
            <ButtonLink to="/salah">Back to Salah</ButtonLink>
          </div>
        </Card>
      ) : (
        <>
          <div className="mt-6 mb-3">
            <div className="mb-1.5 text-sm text-muted">
              Step {index + 1} of {guide.steps.length}
            </div>
            <ProgressBar value={index + 1} max={guide.steps.length} label="Guide progress" valueText={`Step ${index + 1} of ${guide.steps.length}`} />
          </div>
          <div ref={stepRef} tabIndex={-1} className="rounded-2xl border border-line bg-surface p-5 outline-none sm:p-7" key={step.id}>
            <h2 className="text-xl font-semibold">{step.title}</h2>
            {step.illustration && <img src={step.illustration.src} alt={step.illustration.alt} className="mt-4 max-h-72 rounded-xl border border-line" loading="lazy" />}
            <p className="mt-3 text-[1.05rem]">{step.explanation}</p>
            {step.recitation && (
              <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4">
                <p className="mb-1 text-xs font-semibold tracking-wide text-gold uppercase">What is said</p>
                <ArabicText>{step.recitation.arabic}</ArabicText>
                {step.recitation.transliteration && state.preferences.display.showTransliteration && <p className="mt-2 text-muted italic">{step.recitation.transliteration}</p>}
                <p className="mt-2">{step.recitation.translation}</p>
                {step.recitation.audio && (
                  <div className="mt-3">
                    <Button variant="secondary" size="sm" icon={<Play aria-hidden className="size-4" />} onClick={() => new Audio(step.recitation!.audio!.url).play().catch(() => setAudioError(true))}>
                      Listen
                    </Button>
                    <p className="mt-1 text-xs text-muted">{audioError ? 'Audio is unavailable right now.' : `Audio: ${step.recitation.audio.credit}`}</p>
                  </div>
                )}
                <p className="mt-3 text-xs text-muted">Source: {sourceOf(step.recitation.sourceId)?.title ?? 'see sources below'}</p>
              </div>
            )}
            {step.whyItMatters && (
              <p className="mt-5 flex gap-2 rounded-xl bg-primary-soft p-4 text-sm">
                <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <span className="font-semibold">Why this matters: </span>
                  {step.whyItMatters}
                </span>
              </p>
            )}
          </div>
          <div className="mt-4 flex justify-between gap-3">
            <Button variant="secondary" disabled={index === 0} onClick={() => go(index - 1)} icon={<ChevronLeft aria-hidden className="size-4" />}>
              Previous
            </Button>
            {index < guide.steps.length - 1 ? (
              <Button onClick={() => go(index + 1)}>
                Next step <ChevronRight aria-hidden className="size-4" />
              </Button>
            ) : (
              <Button onClick={complete}>Finish guide</Button>
            )}
          </div>
        </>
      )}

      <section aria-labelledby="guide-sources" className="mt-10">
        <h2 id="guide-sources" className="text-lg font-semibold">
          Sources and review
        </h2>
        <div className="mt-3">
          <SourceList sources={guide.sources} />
        </div>
        <div className="mt-4">
          <ReviewDetails item={guide} />
        </div>
      </section>
    </div>
  );
}
