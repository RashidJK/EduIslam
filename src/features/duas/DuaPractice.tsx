import { useMemo, useState } from 'react';
import { Eye, EyeOff, Play } from 'lucide-react';
import type { Dua } from '@/domain/content/library';
import { reviewDua } from '@/domain/learner/actions';
import { seededShuffle } from '@/domain/lessons/evaluate';
import { RATING_DESCRIPTIONS, RATING_LABELS, RATINGS, type Rating } from '@/domain/srs/scheduler';
import { ArabicText } from '@/components/ui/ArabicText';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { Select } from '@/components/ui/Field';
import { useLearner } from '@/app/learner';

type Stage = 'follow' | 'match' | 'recall' | 'rate' | 'done';

function MatchPhrases({ dua, onDone }: { dua: Dua; onDone: () => void }) {
  const phrases = dua.phrases!;
  const meanings = useMemo(() => seededShuffle(phrases.map((p, i) => ({ id: String(i), meaning: p.meaning })), dua.id), [phrases, dua.id]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const complete = phrases.every((_, i) => answers[i] !== undefined);
  return (
    <div>
      <h3 className="text-lg font-semibold">Match each phrase to its meaning</h3>
      <ul className="mt-3 space-y-2">
        {phrases.map((p, i) => {
          const ok = checked ? answers[i] === String(i) : null;
          return (
            <li key={i} className={cn('rounded-xl border p-3', ok === true ? 'border-success bg-success-soft' : ok === false ? 'border-error bg-error-soft' : 'border-line')}>
              <label htmlFor={`${dua.id}-phrase-${i}`} className="block">
                <ArabicText variant="arabic">{p.arabic}</ArabicText>
                <span className="sr-only">Choose the meaning of this phrase</span>
              </label>
              <Select id={`${dua.id}-phrase-${i}`} value={answers[i] ?? ''} disabled={checked} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}>
                <option value="" disabled>
                  Choose a meaning…
                </option>
                {meanings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.meaning}
                  </option>
                ))}
              </Select>
              {ok === false && <p className="mt-1 text-sm">Means: {p.meaning}</p>}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex justify-end">
        {checked ? <Button onClick={onDone}>Continue</Button> : <Button disabled={!complete} onClick={() => setChecked(true)}>Check</Button>}
      </div>
    </div>
  );
}

export function DuaPractice({ dua }: { dua: Dua }) {
  const { update, state } = useLearner();
  const hasPhrases = Boolean(dua.phrases?.length);
  const [stage, setStage] = useState<Stage>('follow');
  const [showTranslit, setShowTranslit] = useState(state.preferences.display.showTransliteration);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<{ rating: Rating; explanation: string } | null>(null);
  const [audioError, setAudioError] = useState(false);

  const rate = (rating: Rating) => {
    let explanation = '';
    update(['duas', 'activity', 'plans'], (s, now) => {
      const r = reviewDua(s, { duaId: dua.id, rating }, now);
      explanation = r.explanation;
      return r.state;
    });
    setResult({ rating, explanation });
    setStage('done');
  };

  return (
    <section aria-labelledby="practice-heading" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="practice-heading" className="text-lg font-semibold">
        Practise this dua
      </h2>

      {stage === 'follow' && (
        <div className="mt-3">
          <p className="text-muted">Read along{dua.audio ? ' while you listen' : ''}. Use the transliteration as a guide if it helps.</p>
          {dua.audio && (
            <div className="mt-3">
              <Button variant="secondary" size="sm" icon={<Play aria-hidden className="size-4" />} onClick={() => new Audio(dua.audio!.url).play().catch(() => setAudioError(true))}>
                Listen
              </Button>
              <p className="mt-1 text-xs text-muted">{audioError ? 'Audio is unavailable right now.' : `Audio: ${dua.audio.credit} · ${dua.audio.license}`}</p>
            </div>
          )}
          <ArabicText className="mt-4">{dua.arabic}</ArabicText>
          {dua.transliteration && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                icon={showTranslit ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                onClick={() => setShowTranslit((v) => !v)}
                aria-pressed={showTranslit}
              >
                {showTranslit ? 'Hide transliteration' : 'Show transliteration'}
              </Button>
              {showTranslit && <p className="mt-1 text-muted italic">{dua.transliteration}</p>}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setStage(hasPhrases ? 'match' : 'recall')}>Continue</Button>
          </div>
        </div>
      )}

      {stage === 'match' && (
        <div className="mt-3">
          <MatchPhrases dua={dua} onDone={() => setStage('recall')} />
        </div>
      )}

      {stage === 'recall' && (
        <div className="mt-3">
          <p className="text-muted">Now say the dua from memory. Reveal it when you’re ready to check.</p>
          <p className="mt-2 font-medium">Meaning: {dua.translation}</p>
          {revealed ? (
            <>
              <ArabicText className="mt-4">{dua.arabic}</ArabicText>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setStage('rate')}>Rate my recall</Button>
              </div>
            </>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong px-4 py-6">
              <span className="text-muted">Arabic text hidden</span>
              <Button variant="secondary" icon={<Eye aria-hidden className="size-4" />} onClick={() => setRevealed(true)}>
                Reveal
              </Button>
            </div>
          )}
        </div>
      )}

      {stage === 'rate' && (
        <fieldset className="mt-3">
          <legend className="mb-2 font-medium">How did your recall go?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {RATINGS.map((r) => (
              <button key={r} type="button" onClick={() => rate(r)} className="rounded-xl border border-line-strong bg-surface p-3 text-left hover:border-primary hover:bg-primary-soft">
                <span className="block font-semibold">{RATING_LABELS[r]}</span>
                <span className="block text-sm text-muted">{RATING_DESCRIPTIONS[r]}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {stage === 'done' && result && (
        <div className="mt-3" role="status">
          <p>
            Saved. You rated this <span className="font-semibold">{RATING_LABELS[result.rating]}</span>. {result.explanation}
          </p>
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRevealed(false);
                setResult(null);
                setStage('follow');
              }}
            >
              Practise again
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
