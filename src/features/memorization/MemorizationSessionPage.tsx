import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Archive, ChevronLeft, Eye, Play, Repeat, Trash2 } from 'lucide-react';
import { deleteMemorizationItem, dueMemorization, reviewMemorization, updateMemorizationItem } from '@/domain/learner/actions';
import type { MemorizationItem } from '@/domain/learner/schema';
import { deriveMemorizationStatus, MEMORIZATION_STATUS_HELP, MEMORIZATION_STATUS_LABELS, passageLabel } from '@/domain/memorization/status';
import { getSurahMeta } from '@/domain/quran/metadata';
import type { Verse } from '@/domain/quran/types';
import { RATING_DESCRIPTIONS, RATING_LABELS, RATINGS, describeDue, type Rating } from '@/domain/srs/scheduler';
import { formatDateKey } from '@/domain/time';
import { ArabicText } from '@/components/ui/ArabicText';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Notice } from '@/components/ui/Notice';
import { LoadingState } from '@/components/ui/States';
import { NotFoundPage } from '@/features/errors/ErrorPages';
import { useAudio } from '@/features/audio/AudioProvider';
import { QuranAttribution, QuranErrorState } from '@/features/quran/QuranStates';
import { useLearner } from '@/app/learner';
import { useSurah } from '@/app/queries';

const STEPS = [
  { id: 'listen', label: 'Listen' },
  { id: 'read', label: 'Read along' },
  { id: 'repeat', label: 'Repeat' },
  { id: 'recall', label: 'Recall' },
  { id: 'rate', label: 'Check yourself' },
] as const;
type StepId = (typeof STEPS)[number]['id'] | 'done';

export function MemorizationSessionPage() {
  const { itemId } = useParams();
  const { state } = useLearner();
  const item = state.memorization.find((m) => m.id === itemId);
  if (!item) return <NotFoundPage />;
  return <Session key={item.id} item={item} />;
}

function VerseText({ verses, showTranslation, playingVerse }: { verses: Verse[]; showTranslation: boolean; playingVerse?: number }) {
  return (
    <ol className="space-y-2" aria-label="Passage text">
      {verses.map((v) => (
        <li key={v.number} className={cn('rounded-xl border px-4 py-2', playingVerse === v.number ? 'border-gold-line bg-gold-soft/60' : 'border-transparent')} aria-current={playingVerse === v.number ? 'true' : undefined}>
          <span className="verse-marker text-muted">
            <span className="sr-only">Verse </span>
            {v.number}
          </span>
          <ArabicText variant="quran">{v.arabic}</ArabicText>
          {showTranslation && v.translation && (
            <p lang="en" className="text-sm text-muted">
              {v.translation}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

function Session({ item }: { item: MemorizationItem }) {
  const { state, update, today } = useLearner();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const meta = getSurahMeta(item.surah)!;
  const surah = useSurah(item.surah, true);
  const { track, status: audioStatus, index, controller } = useAudio();
  const isReview = item.history.length > 0;
  const [step, setStep] = useState<StepId>(isReview ? 'recall' : 'listen');
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [note, setNote] = useState('');
  const [result, setResult] = useState<{ rating: Rating; explanation: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const notesId = useId();
  const noteId = useId();

  const verses = surah.data?.verses.slice(item.fromVerse - 1, item.toVerse) ?? [];
  const title = passageLabel(meta.nameTransliterated, item.surah, item.fromVerse, item.toVerse);
  const status = deriveMemorizationStatus(item.srs, item.history);
  const range = { from: item.fromVerse, to: item.toVerse };
  const isThisTrack = track?.surah === item.surah;
  const playingVerse = isThisTrack && audioStatus !== 'idle' ? track?.verses[index]?.verse : undefined;
  const reciterId = state.preferences.reciterId;

  // Hiding the text means hiding the recitation too.
  useEffect(() => {
    if (step === 'recall') controller.pause();
  }, [step, controller]);

  const playPassage = (repeat: 'once' | 'loop' | 'each-3') => {
    controller.setRepeat(repeat === 'loop' ? { mode: 'range', times: 1 } : repeat === 'each-3' ? { mode: 'verse', times: 3 } : { mode: 'off', times: 1 });
    void controller.play({ surah: item.surah, reciterId, fromVerse: item.fromVerse, range });
  };

  const rate = (rating: Rating) => {
    let explanation = '';
    update(['memorization', 'activity', 'plans'], (s, now) => {
      const r = reviewMemorization(s, { itemId: item.id, rating, note: note.trim() || undefined }, now);
      explanation = r.explanation;
      return r.state;
    });
    setResult({ rating, explanation });
    setStep('done');
  };

  const nextDue = dueMemorization(state, today).find((m) => m.id !== item.id);
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/memorization" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" /> Memorization
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">{MEMORIZATION_STATUS_LABELS[status]}</Badge>
        <span className="text-sm text-muted">{describeDue(item.srs, today)}</span>
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      {params.get('existing') && (
        <Notice tone="info" className="mt-4">
          You are already memorizing this passage, so we opened it here.
        </Notice>
      )}

      {step !== 'done' && (
        <nav aria-label="Session steps" className="mt-5">
          <ol className="flex flex-wrap gap-2">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  aria-current={step === s.id ? 'step' : undefined}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium',
                    step === s.id ? 'border-primary bg-primary text-on-primary' : i < stepIndex ? 'border-line bg-primary-soft text-primary' : 'border-line bg-surface text-muted',
                  )}
                >
                  <span className="tabular-nums">{i + 1}.</span> {s.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <Card className="mt-5 p-5 sm:p-7">
        {surah.isLoading && <LoadingState label="Loading the passage…" />}
        {surah.isError && <QuranErrorState error={surah.error} onRetry={() => surah.refetch()} />}
        {surah.data && (
          <>
            {step === 'listen' && (
              <div>
                <h2 className="text-xl font-semibold">Listen to the passage</h2>
                <p className="mt-1 text-muted">Listen closely a few times before reading. Notice the rhythm and where each verse ends.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button icon={<Play aria-hidden className="size-4" />} onClick={() => playPassage('once')}>
                    Play passage
                  </Button>
                  <Button variant="secondary" icon={<Repeat aria-hidden className="size-4" />} onClick={() => playPassage('loop')}>
                    Play on repeat
                  </Button>
                </div>
                {playingVerse && (
                  <p className="mt-3 text-sm text-muted" aria-live="polite">
                    Playing verse {playingVerse}
                  </p>
                )}
              </div>
            )}

            {step === 'read' && (
              <div>
                <h2 className="text-xl font-semibold">Read along while listening</h2>
                <p className="mt-1 mb-4 text-muted">Follow the words as they are recited. The current verse is highlighted.</p>
                <Button variant="secondary" size="sm" icon={<Play aria-hidden className="size-4" />} onClick={() => playPassage('once')} className="mb-3">
                  Play passage
                </Button>
                <VerseText verses={verses} showTranslation={state.preferences.display.showTranslation} playingVerse={playingVerse} />
              </div>
            )}

            {step === 'repeat' && (
              <div>
                <h2 className="text-xl font-semibold">Repeat it yourself</h2>
                <p className="mt-1 mb-4 text-muted">Recite each verse after the reciter, then the whole passage. Repetition builds recall.</p>
                <Button variant="secondary" size="sm" icon={<Repeat aria-hidden className="size-4" />} onClick={() => playPassage('each-3')} className="mb-3">
                  Play each verse three times
                </Button>
                <VerseText verses={verses} showTranslation={false} playingVerse={playingVerse} />
              </div>
            )}

            {step === 'recall' && (
              <div>
                <h2 className="text-xl font-semibold">Recall without the text</h2>
                <p className="mt-1 mb-4 text-muted">
                  Recite the passage from memory, connecting the verses together. Reveal a verse only to check yourself.
                </p>
                <ol className="space-y-2" aria-label="Hidden verses">
                  {verses.map((v) => (
                    <li key={v.number} className="rounded-xl border border-dashed border-line-strong px-4 py-3">
                      {revealed.has(v.number) ? (
                        <ArabicText variant="quran">{v.arabic}</ArabicText>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted">Verse {v.number} — hidden</span>
                          <Button variant="ghost" size="sm" icon={<Eye aria-hidden className="size-4" />} onClick={() => setRevealed((r) => new Set(r).add(v.number))}>
                            Reveal verse {v.number}
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex justify-end">
                  <Button onClick={() => setStep('rate')}>I’ve recited it — check myself</Button>
                </div>
              </div>
            )}

            {step === 'rate' && (
              <div>
                <h2 className="text-xl font-semibold">Compare and rate your recall</h2>
                <p className="mt-1 mb-4 text-muted">Here is the full passage. Be honest with yourself — your rating only decides when it comes back.</p>
                <VerseText verses={verses} showTranslation={false} />
                <div className="mt-5">
                  <label htmlFor={noteId} className="mb-1.5 block text-sm font-medium">
                    Note for this review (optional)
                  </label>
                  <input
                    id={noteId}
                    value={note}
                    maxLength={500}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. mixed up verse 3"
                    className="block min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 focus:border-primary focus:outline-none"
                  />
                </div>
                <fieldset className="mt-5">
                  <legend className="mb-2 font-medium">How did your recall go?</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {RATINGS.map((r) => (
                      <button key={r} type="button" onClick={() => rate(r)} className="rounded-xl border border-line-strong bg-surface p-3.5 text-left hover:border-primary hover:bg-primary-soft">
                        <span className="block font-semibold">{RATING_LABELS[r]}</span>
                        <span className="block text-sm text-muted">{RATING_DESCRIPTIONS[r]}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {step === 'done' && result && (
              <div role="status">
                <h2 className="text-xl font-semibold">Session saved</h2>
                <p className="mt-2">
                  You rated this <span className="font-semibold">{RATING_LABELS[result.rating]}</span>. {result.explanation}
                </p>
                <p className="mt-2 text-sm text-muted">
                  Status: {MEMORIZATION_STATUS_LABELS[status]} — {MEMORIZATION_STATUS_HELP[status]}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {nextDue ? (
                    <ButtonLink to={`/memorization/${nextDue.id}`}>Next due passage</ButtonLink>
                  ) : (
                    <ButtonLink to="/memorization">Back to memorization</ButtonLink>
                  )}
                  <ButtonLink to="/app" variant="secondary">
                    Dashboard
                  </ButtonLink>
                </div>
              </div>
            )}
            <div className="mt-6 border-t border-line pt-3">
              <QuranAttribution arabic={surah.data.arabicEdition} translation={surah.data.translationEdition} />
            </div>
          </>
        )}
      </Card>

      {step !== 'done' && step !== 'rate' && step !== 'recall' && (
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setStep(STEPS[stepIndex + 1]!.id)}>Next: {STEPS[stepIndex + 1]!.label}</Button>
        </div>
      )}

      <section aria-labelledby="passage-details" className="mt-10 space-y-4">
        <h2 id="passage-details" className="text-lg font-semibold">
          Passage details
        </h2>
        <div>
          <label htmlFor={notesId} className="mb-1.5 block text-sm font-medium">
            Your notes
          </label>
          <textarea
            id={notesId}
            rows={2}
            maxLength={1000}
            defaultValue={item.notes}
            onBlur={(e) => update(['memorization'], (s) => updateMemorizationItem(s, { itemId: item.id, notes: e.target.value }))}
            className="block w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <h3 className="text-sm font-medium">Review history</h3>
          {item.history.length === 0 ? (
            <p className="text-sm text-muted">No reviews yet. Started {formatDateKey(item.startedOn)}.</p>
          ) : (
            <ol className="mt-1 space-y-1 text-sm">
              {[...item.history].reverse().map((h) => (
                <li key={h.at} className="flex gap-3">
                  <span className="w-28 text-muted">{formatDateKey(h.on)}</span>
                  <span className="font-medium">{RATING_LABELS[h.rating]}</span>
                  {h.note && <span className="text-muted">— {h.note}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<Archive aria-hidden className="size-4" />} onClick={() => update(['memorization'], (s) => updateMemorizationItem(s, { itemId: item.id, archived: !item.archived }))}>
            {item.archived ? 'Restore from archive' : 'Archive'}
          </Button>
          <Button variant="secondary" size="sm" className="text-error" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => setConfirmDelete(true)}>
            Delete passage
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          navigate('/memorization', { replace: true });
          update(['memorization'], (s) => deleteMemorizationItem(s, item.id));
        }}
        title="Delete this passage?"
        description="Its review history will be removed. Archiving keeps the history instead."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
