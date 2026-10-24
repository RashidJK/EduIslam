import { useId, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { startMemorization } from '@/domain/learner/actions';
import { getSurahMeta, SURAHS } from '@/domain/quran/metadata';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldLabel, Select, TextInput } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { validateRange } from '@/domain/memorization/range';
import { useLearner } from '@/app/learner';

const SUGGESTED_MAX = 10;

export function NewMemorizationPage() {
  const { state, update } = useLearner();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialSurah = getSurahMeta(Number(params.get('surah')))?.number ?? 1;
  const [surah, setSurah] = useState(initialSurah);
  const [from, setFrom] = useState(params.get('from') ?? '1');
  const [to, setTo] = useState(params.get('to') ?? String(Math.min(getSurahMeta(initialSurah)!.verseCount, 3)));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ids = { surah: useId(), from: useId(), to: useId(), notes: useId(), error: useId() };
  const meta = getSurahMeta(surah)!;
  const count = Number(to) - Number(from) + 1;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateRange(surah, Number(from), Number(to));
    setError(problem);
    if (problem) return;
    const existing = state.memorization.find((m) => !m.archived && m.surah === surah && m.fromVerse === Number(from) && m.toVerse === Number(to));
    let itemId = existing?.id;
    update(['memorization'], (s, now) => {
      const r = startMemorization(s, { surah, fromVerse: Number(from), toVerse: Number(to), notes }, now);
      itemId = r.item.id;
      return r.state;
    });
    navigate(`/memorization/${itemId}${existing ? '?existing=1' : ''}`);
  };

  return (
    <div className="max-w-xl">
      <Link to="/memorization" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" /> Memorization
      </Link>
      <PageHeader title="Choose a passage" description="Start small. A few verses at a time, revised well, goes a long way." />
      <Card>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <FieldLabel htmlFor={ids.surah}>Surah</FieldLabel>
            <Select
              id={ids.surah}
              value={surah}
              onChange={(e) => {
                const n = Number(e.target.value);
                setSurah(n);
                setFrom('1');
                setTo(String(Math.min(getSurahMeta(n)!.verseCount, 3)));
              }}
            >
              {SURAHS.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.nameTransliterated} ({s.verseCount} verses)
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor={ids.from}>From verse</FieldLabel>
              <TextInput id={ids.from} type="number" inputMode="numeric" min={1} max={meta.verseCount} value={from} onChange={(e) => setFrom(e.target.value)} aria-describedby={error ? ids.error : undefined} aria-invalid={Boolean(error)} />
            </div>
            <div>
              <FieldLabel htmlFor={ids.to}>To verse</FieldLabel>
              <TextInput id={ids.to} type="number" inputMode="numeric" min={1} max={meta.verseCount} value={to} onChange={(e) => setTo(e.target.value)} aria-describedby={error ? ids.error : undefined} aria-invalid={Boolean(error)} />
            </div>
          </div>
          {error && (
            <p id={ids.error} role="alert" className="text-sm font-medium text-error">
              {error}
            </p>
          )}
          {!error && count > SUGGESTED_MAX && (
            <Notice tone="info">That’s {count} verses. Many learners find it easier to split long passages into smaller parts.</Notice>
          )}
          <div>
            <FieldLabel htmlFor={ids.notes} hint="Optional. Private to you.">
              Notes
            </FieldLabel>
            <textarea
              id={ids.notes}
              rows={2}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="block w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 focus:border-primary focus:outline-none"
            />
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Start memorizing
          </Button>
        </form>
      </Card>
    </div>
  );
}
