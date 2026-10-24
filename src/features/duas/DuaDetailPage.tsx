import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ChevronLeft, Heart, ListPlus } from 'lucide-react';
import { editPlan, setPlan, toggleFavorite } from '@/domain/learner/actions';
import { describeDue } from '@/domain/srs/scheduler';
import { ArabicText } from '@/components/ui/ArabicText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ReviewBadge, ReviewDetails, SourceList } from '@/components/content/ReviewInfo';
import { NotFoundPage } from '@/features/errors/ErrorPages';
import { useLearner } from '@/app/learner';
import { useDua, useDuaCategories } from '@/app/queries';
import { DuaPractice } from './DuaPractice';

export function DuaDetailPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const { state, today, update, now } = useLearner();
  const dua = useDua(slug);
  const categories = useDuaCategories();
  const [practising, setPractising] = useState(params.get('practice') === '1');
  const [added, setAdded] = useState(false);

  if (dua.isLoading) return <LoadingState label="Loading dua…" />;
  if (dua.isError) return <ErrorState message="This dua couldn’t be loaded." onRetry={() => dua.refetch()} />;
  if (!dua.data) return <NotFoundPage />;
  const d = dua.data;
  const favorite = state.favorites.some((f) => f.kind === 'dua' && f.ref === d.id);
  const progress = state.duas[d.id];
  const planItemId = `dua-practice:${d.id}`;
  const inPlan = Boolean(state.plans[today]?.items.some((i) => i.id === planItemId));

  const addToPlan = () => {
    update(['plans'], (s) => {
      const plan = s.plans[today] ?? { date: today, items: [], generatedAt: now().toISOString(), customized: true };
      return setPlan(s, editPlan(plan, { kind: 'add', item: { id: planItemId, type: 'dua-practice', ref: d.id, title: `Practise: ${d.title}`, reason: 'You added this.', minutes: 3, href: `/duas/${d.slug}?practice=1`, status: 'pending' } }));
    });
    setAdded(true);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/duas" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" /> Duas
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <ReviewBadge item={d} />
        {d.categories.map((c) => (
          <Link key={c} to={`/duas?category=${c}`} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted hover:text-ink">
            {categories.data?.find((x) => x.slug === c)?.title ?? c}
          </Link>
        ))}
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{d.title}</h1>
      <p className="mt-1 text-muted">{d.usage}</p>
      {d.notice && (
        <Notice tone="info" className="mt-4">
          {d.notice}
        </Notice>
      )}

      <Card className="mt-6">
        <p className="mb-1 text-xs font-semibold tracking-wide text-gold uppercase">Text of the dua</p>
        <ArabicText>{d.arabic}</ArabicText>
        {d.transliteration && state.preferences.display.showTransliteration && <p className="mt-3 text-muted italic">{d.transliteration}</p>}
        <p className="mt-3 text-[1.02rem]">
          <span className="sr-only">Meaning: </span>
          {d.translation}
        </p>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        {!practising && <Button onClick={() => setPractising(true)}>Practise this dua</Button>}
        <Button variant="secondary" icon={<Heart aria-hidden className={favorite ? 'size-4 fill-current' : 'size-4'} />} aria-pressed={favorite} onClick={() => update(['favorites'], (s) => toggleFavorite(s, { kind: 'dua', ref: d.id }))}>
          {favorite ? 'Saved to favourites' : 'Add to favourites'}
        </Button>
        <Button variant="secondary" icon={<ListPlus aria-hidden className="size-4" />} onClick={addToPlan} disabled={inPlan}>
          {inPlan ? 'In today’s plan' : 'Add to today’s plan'}
        </Button>
      </div>
      {added && (
        <p role="status" className="mt-2 text-sm text-muted">
          Added to today’s plan.
        </p>
      )}
      {progress && <p className="mt-3 text-sm text-muted">Practised {progress.history.length} time{progress.history.length === 1 ? '' : 's'} · {describeDue(progress.srs, today)}</p>}

      {practising && (
        <div className="mt-6">
          <DuaPractice dua={d} />
        </div>
      )}

      {d.explanatoryNotes && (
        <section aria-labelledby="notes" className="mt-8">
          <h2 id="notes" className="text-lg font-semibold">
            Explanatory note
          </h2>
          <p className="mt-1 text-xs text-muted">This note explains the dua. It is not part of the narrated text.</p>
          <p className="mt-2">{d.explanatoryNotes}</p>
        </section>
      )}

      <section aria-labelledby="sources" className="mt-8">
        <h2 id="sources" className="text-lg font-semibold">
          Source and authenticity
        </h2>
        {d.authenticity && (
          <p className="mt-2 text-sm">
            <span className="font-medium">Grading:</span> {d.authenticity.grade} — according to {d.authenticity.gradedBy}.
          </p>
        )}
        <div className="mt-3">
          <SourceList sources={d.sources} />
        </div>
        <div className="mt-4">
          <ReviewDetails item={d} />
        </div>
      </section>
    </div>
  );
}
