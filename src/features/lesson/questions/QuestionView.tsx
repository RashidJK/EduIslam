import { useId, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, CircleCheck, Eye, Info, Play, X } from 'lucide-react';
import { seededShuffle, type Evaluation, type QuestionResponse } from '@/domain/lessons/evaluate';
import type { Question } from '@/domain/lessons/schema';
import { ArabicText } from '@/components/ui/ArabicText';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { Select } from '@/components/ui/Field';

export interface QuestionInputProps<Q extends Question = Question> {
  question: Q;
  response: QuestionResponse | undefined;
  onChange: (response: QuestionResponse) => void;
  locked: boolean;
  evaluation: Evaluation | null;
}

type Option = { id: string; label: string; arabic?: string };

function OptionLabel({ option }: { option: Option }) {
  return option.arabic ? (
    <span className="flex items-center gap-3">
      <ArabicText variant="inline" as="span" className="text-2xl">
        {option.arabic}
      </ArabicText>
      <span>{option.label}</span>
    </span>
  ) : (
    <span>{option.label}</span>
  );
}

/** Radio or checkbox options. After checking, the correct option(s) are marked with icon and text. */
function OptionList({
  name,
  options,
  multiple,
  selected,
  correctIds,
  locked,
  onToggle,
}: {
  name: string;
  options: Option[];
  multiple: boolean;
  selected: string[];
  correctIds: string[] | null;
  locked: boolean;
  onToggle: (id: string, on: boolean) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((o) => {
        const isSelected = selected.includes(o.id);
        const isCorrect = correctIds?.includes(o.id) ?? false;
        const showWrong = correctIds && isSelected && !isCorrect;
        return (
          <label
            key={o.id}
            className={cn(
              'flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ilc-focus)]',
              locked ? 'cursor-default' : 'cursor-pointer hover:border-line-strong',
              correctIds && isCorrect ? 'border-success bg-success-soft' : showWrong ? 'border-error bg-error-soft' : isSelected ? 'border-primary bg-primary-soft' : 'border-line bg-surface',
            )}
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={name}
              value={o.id}
              checked={isSelected}
              disabled={locked}
              onChange={(e) => onToggle(o.id, e.target.checked)}
              className="size-4 accent-[var(--ilc-primary)]"
            />
            <span className="flex-1">
              <OptionLabel option={o} />
            </span>
            {correctIds && isCorrect && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                <Check aria-hidden className="size-4" /> Correct answer
              </span>
            )}
            {showWrong && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-error">
                <X aria-hidden className="size-4" /> Your answer
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

function ChoiceInput({ question, response, onChange, locked, evaluation }: QuestionInputProps<Extract<Question, { type: 'single-choice' | 'fill-blank' | 'listen-select' }>>) {
  const name = useId();
  const options = useMemo(() => seededShuffle(question.options, question.id), [question]);
  const selected = response && 'optionId' in response ? [response.optionId] : [];
  return (
    <OptionList
      name={name}
      options={options}
      multiple={false}
      selected={selected}
      correctIds={evaluation ? [question.correctOptionId] : null}
      locked={locked}
      onToggle={(id) => onChange({ type: question.type, optionId: id })}
    />
  );
}

function MultiInput({ question, response, onChange, locked, evaluation }: QuestionInputProps<Extract<Question, { type: 'multi-select' }>>) {
  const name = useId();
  const options = useMemo(() => seededShuffle(question.options, question.id), [question]);
  const selected = response?.type === 'multi-select' ? response.optionIds : [];
  return (
    <OptionList
      name={name}
      options={options}
      multiple
      selected={selected}
      correctIds={evaluation ? question.correctOptionIds : null}
      locked={locked}
      onToggle={(id, on) => onChange({ type: 'multi-select', optionIds: on ? [...selected, id] : selected.filter((x) => x !== id) })}
    />
  );
}

function MatchInput({ question, response, onChange, locked, evaluation }: QuestionInputProps<Extract<Question, { type: 'match-pairs' }>>) {
  const rights = useMemo(() => seededShuffle(question.pairs, `${question.id}-r`), [question]);
  const matches = response?.type === 'match-pairs' ? response.matches : {};
  const baseId = useId();
  return (
    <ul className="grid gap-2">
      {question.pairs.map((pair) => {
        const chosen = matches[pair.id];
        const correct = evaluation ? chosen === pair.id : null;
        const id = `${baseId}-${pair.id}`;
        return (
          <li
            key={pair.id}
            className={cn('flex flex-wrap items-center gap-3 rounded-xl border p-3', correct === true ? 'border-success bg-success-soft' : correct === false ? 'border-error bg-error-soft' : 'border-line')}
          >
            <label htmlFor={id} className="min-w-20 flex-1">
              {pair.leftIsArabic ? (
                <ArabicText variant="inline" as="span" className="text-3xl">
                  {pair.left}
                </ArabicText>
              ) : (
                <span className="font-medium">{pair.left}</span>
              )}
              <span className="sr-only">, choose its match</span>
            </label>
            <Select
              id={id}
              className="w-auto min-w-44 flex-1"
              value={chosen ?? ''}
              disabled={locked}
              onChange={(e) => onChange({ type: 'match-pairs', matches: { ...matches, [pair.id]: e.target.value } })}
            >
              <option value="" disabled>
                Choose…
              </option>
              {rights.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.right}
                </option>
              ))}
            </Select>
            {correct === true && <CircleCheck aria-label="Correct" className="size-5 text-success" />}
            {correct === false && (
              <span className="w-full text-sm text-error">
                <X aria-hidden className="inline size-4" /> Matches “{pair.right}”
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function OrderInput({ question, response, onChange, locked, evaluation }: QuestionInputProps<Extract<Question, { type: 'order-steps' }>>) {
  const initial = useMemo(() => seededShuffle(question.items, question.id).map((i) => i.id), [question]);
  const order = response?.type === 'order-steps' ? response.order : initial;
  const labelOf = (id: string) => question.items.find((i) => i.id === id)?.label ?? id;
  const [announcement, setAnnouncement] = useState('');
  const move = (index: number, dir: -1 | 1) => {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange({ type: 'order-steps', order: next });
    setAnnouncement(`${labelOf(next[target]!)} moved to position ${target + 1}`);
  };
  return (
    <>
      <ol className="grid gap-2" aria-label="Your order">
        {order.map((id, i) => {
          const correct = evaluation ? question.items[i]?.id === id : null;
          return (
            <li
              key={id}
              className={cn('flex items-center gap-3 rounded-xl border p-2.5 pl-4', correct === true ? 'border-success bg-success-soft' : correct === false ? 'border-error bg-error-soft' : 'border-line bg-surface')}
            >
              <span className="w-6 text-sm font-semibold text-muted tabular-nums">{i + 1}.</span>
              <span className="flex-1 font-medium">{labelOf(id)}</span>
              {!locked && (
                <span className="flex">
                  <button type="button" className="rounded-lg p-2 hover:bg-surface-2 disabled:opacity-40" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${labelOf(id)} up`}>
                    <ArrowUp aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 hover:bg-surface-2 disabled:opacity-40"
                    disabled={i === order.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${labelOf(id)} down`}
                  >
                    <ArrowDown aria-hidden className="size-4" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

function ReflectionInput({ question, response, onChange, locked }: QuestionInputProps<Extract<Question, { type: 'reflection' }>>) {
  const id = useId();
  return (
    <div>
      {question.guidance && <p className="mb-3 text-sm text-muted">{question.guidance}</p>}
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        Your thoughts (optional)
      </label>
      <textarea
        id={id}
        rows={3}
        disabled={locked}
        value={response?.type === 'reflection' ? response.text : ''}
        onChange={(e) => onChange({ type: 'reflection', text: e.target.value })}
        className="block w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 focus:border-primary focus:outline-none"
      />
      <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted">
        <Info aria-hidden className="size-3.5" /> Reflections are not scored or saved.
      </p>
    </div>
  );
}

function RecallInput({ question, response, onChange, locked }: QuestionInputProps<Extract<Question, { type: 'recall' }>>) {
  const [revealed, setRevealed] = useState(Boolean(response));
  const value = response?.type === 'recall' ? response.selfAssessment : undefined;
  return (
    <div>
      {!revealed ? (
        <Button variant="secondary" icon={<Eye aria-hidden className="size-4" />} onClick={() => setRevealed(true)}>
          Reveal answer
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-gold-line/50 bg-gold-soft p-4" aria-live="polite">
            <p className="text-xs font-semibold text-gold uppercase">Answer</p>
            {question.answerIsArabic ? <ArabicText>{question.answer}</ArabicText> : <p className="mt-1 text-lg font-medium">{question.answer}</p>}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">How did you do?</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['recalled', 'I recalled it'],
                  ['partly', 'Partly'],
                  ['not-yet', 'Not yet'],
                ] as const
              ).map(([v, label]) => (
                <label
                  key={v}
                  className={cn(
                    'inline-flex min-h-11 cursor-pointer items-center rounded-xl border px-4 text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--ilc-focus)]',
                    value === v ? 'border-primary bg-primary text-on-primary' : 'border-line-strong hover:bg-surface-2',
                  )}
                >
                  <input type="radio" className="sr-only" name={`${question.id}-self`} checked={value === v} disabled={locked} onChange={() => onChange({ type: 'recall', selfAssessment: v })} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}

function ListenButton({ url, credit }: { url: string; credit: string }) {
  const [error, setError] = useState(false);
  return (
    <div className="mb-3">
      <Button
        variant="secondary"
        icon={<Play aria-hidden className="size-4" />}
        onClick={() => {
          new Audio(url).play().catch(() => setError(true));
        }}
      >
        Play audio
      </Button>
      <p className="mt-1 text-xs text-muted">{error ? 'Audio is unavailable right now.' : `Audio: ${credit}`}</p>
    </div>
  );
}

export function QuestionInput(props: QuestionInputProps) {
  const q = props.question;
  switch (q.type) {
    case 'single-choice':
    case 'fill-blank':
      return <ChoiceInput {...(props as QuestionInputProps<typeof q>)} />;
    case 'listen-select':
      return (
        <>
          <ListenButton url={q.audio.url} credit={q.audio.credit} />
          <ChoiceInput {...(props as QuestionInputProps<typeof q>)} />
        </>
      );
    case 'multi-select':
      return <MultiInput {...(props as QuestionInputProps<typeof q>)} />;
    case 'match-pairs':
      return <MatchInput {...(props as QuestionInputProps<typeof q>)} />;
    case 'order-steps':
      return <OrderInput {...(props as QuestionInputProps<typeof q>)} />;
    case 'reflection':
      return <ReflectionInput {...(props as QuestionInputProps<typeof q>)} />;
    case 'recall':
      return <RecallInput {...(props as QuestionInputProps<typeof q>)} />;
  }
}

export function QuestionPrompt({ question }: { question: Question }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold">
        {question.type === 'fill-blank' ? (
          <>
            {question.before} <span className="inline-block min-w-16 border-b-2 border-line-strong align-baseline">&nbsp;</span> {question.after}
            <span className="sr-only">, fill in the blank</span>
          </>
        ) : (
          question.prompt
        )}
      </h2>
      {question.type === 'fill-blank' && <p className="mt-1 text-sm text-muted">{question.prompt}</p>}
      {question.type === 'single-choice' && question.promptArabic && (
        <ArabicText className="mt-3 text-center !text-6xl leading-[1.8]">{question.promptArabic}</ArabicText>
      )}
      {question.type === 'multi-select' && <p className="mt-1 text-sm text-muted">Select every answer that applies.</p>}
    </div>
  );
}
