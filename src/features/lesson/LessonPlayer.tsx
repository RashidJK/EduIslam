import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleCheck, Lightbulb, Target } from 'lucide-react';
import { evaluate, initialResponse, isResponseComplete, isScored, type Evaluation, type QuestionResponse } from '@/domain/lessons/evaluate';
import type { Lesson, LessonStep } from '@/domain/lessons/schema';
import { ArabicText } from '@/components/ui/ArabicText';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { QuestionInput, QuestionPrompt } from './questions/QuestionView';

export interface LessonResult {
  correct: number;
  scored: number;
}

function Feedback({ evaluation }: { evaluation: Evaluation }) {
  const tone = evaluation.correct === true ? 'success' : evaluation.correct === false ? 'warning' : 'info';
  return (
    <div
      className={cn(
        'mt-5 rounded-xl border p-4',
        tone === 'success' && 'border-success/30 bg-success-soft',
        tone === 'warning' && 'border-warning/30 bg-warning-soft',
        tone === 'info' && 'border-info/30 bg-info-soft',
      )}
    >
      <p className="flex items-center gap-2 font-semibold">
        {evaluation.correct === true ? <CircleCheck aria-hidden className="size-5 text-success" /> : <Lightbulb aria-hidden className="size-5 text-warning" />}
        {evaluation.headline}
      </p>
      <p className="mt-1.5 text-sm">{evaluation.explanation}</p>
      {evaluation.correct === false && evaluation.correctAnswer && (
        <p className="mt-2 text-sm">
          <span className="font-medium">Answer: </span>
          {evaluation.correctAnswer}
        </p>
      )}
    </div>
  );
}

function StepContent({ step }: { step: Exclude<LessonStep, { kind: 'question' }> }) {
  switch (step.kind) {
    case 'intro':
      return (
        <>
          <h2 className="text-2xl font-semibold">{step.title}</h2>
          <p className="mt-3 text-lg text-ink/90">{step.body}</p>
          <p className="mt-5 flex items-start gap-2 rounded-xl bg-primary-soft p-4 text-sm">
            <Target aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <span className="font-semibold">Objective: </span>
              {step.objective}
            </span>
          </p>
        </>
      );
    case 'concept':
      return (
        <>
          <h2 className="text-2xl font-semibold">{step.title}</h2>
          <p className="mt-3 text-lg text-ink/90">{step.body}</p>
          {step.arabic && (
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {step.arabic.map((a, i) => (
                <li key={i} className="flex flex-col items-center rounded-xl border border-line bg-surface-2 p-3 text-center">
                  <ArabicText className="!text-center !text-5xl leading-[1.9]">{a.text}</ArabicText>
                  {a.transliteration && <span className="text-sm font-medium text-muted">{a.transliteration}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      );
    case 'read':
      return (
        <>
          <h2 className="text-2xl font-semibold">{step.title}</h2>
          <p className="mt-3 text-lg whitespace-pre-line text-ink/90">{step.body}</p>
        </>
      );
    case 'summary':
      return (
        <>
          <h2 className="text-2xl font-semibold">{step.title}</h2>
          <ul className="mt-4 space-y-2">
            {step.points.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
                {p}
              </li>
            ))}
          </ul>
        </>
      );
  }
}

export function LessonPlayer({
  lesson,
  initialStep = 0,
  initialResult = { correct: 0, scored: 0 },
  onProgress,
  onComplete,
}: {
  lesson: Lesson;
  initialStep?: number;
  initialResult?: LessonResult;
  onProgress: (stepIndex: number, result: LessonResult) => void;
  onComplete: (result: LessonResult) => void;
}) {
  const steps = lesson.steps;
  const [index, setIndex] = useState(Math.min(initialStep, steps.length - 1));
  const [result, setResult] = useState<LessonResult>(initialResult);
  const step = steps[index]!;
  const question = step.kind === 'question' ? step.question : null;
  const [response, setResponse] = useState<QuestionResponse | undefined>(() => (question ? initialResponse(question) : undefined));
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [index]);

  const goNext = (nextResult: LessonResult) => {
    if (index >= steps.length - 1) {
      onComplete(nextResult);
      return;
    }
    const next = index + 1;
    const nextStep = steps[next]!;
    setIndex(next);
    setResponse(nextStep.kind === 'question' ? initialResponse(nextStep.question) : undefined);
    setEvaluation(null);
    onProgress(next, nextResult);
  };

  const check = () => {
    if (!question || !response) return;
    const e = evaluate(question, response);
    setEvaluation(e);
    if (isScored(question)) {
      const next = { correct: result.correct + (e.correct ? 1 : 0), scored: result.scored + 1 };
      setResult(next);
    }
  };

  const isLast = index === steps.length - 1;
  const canCheck = question ? isResponseComplete(question, response) : false;

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1.5 flex justify-between text-sm text-muted">
          <span>
            Step {index + 1} of {steps.length}
          </span>
          <span>{lesson.estimatedMinutes} min</span>
        </div>
        <ProgressBar value={index + 1} max={steps.length} label="Lesson progress" valueText={`Step ${index + 1} of ${steps.length}`} />
      </div>

      <div ref={headingRef} tabIndex={-1} className="animate-fade-in rounded-2xl border border-line bg-surface p-5 outline-none sm:p-7" key={index}>
        {question ? (
          <>
            <QuestionPrompt question={question} />
            <QuestionInput question={question} response={response} onChange={setResponse} locked={Boolean(evaluation)} evaluation={evaluation} />
            <div aria-live="polite">{evaluation && <Feedback evaluation={evaluation} />}</div>
          </>
        ) : (
          <StepContent step={step as Exclude<LessonStep, { kind: 'question' }>} />
        )}
      </div>

      <div className="mt-5 flex justify-end">
        {question && !evaluation ? (
          <Button onClick={check} disabled={!canCheck} size="lg">
            {isScored(question) ? 'Check answer' : 'Continue'}
          </Button>
        ) : (
          <Button onClick={() => goNext(result)} size="lg">
            {isLast ? 'Complete lesson' : 'Continue'} {!isLast && <ArrowRight aria-hidden className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
