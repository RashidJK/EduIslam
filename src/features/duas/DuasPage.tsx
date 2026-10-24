import { useDeferredValue, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { HandHeart, Search, ShieldCheck } from 'lucide-react';
import { filterDuas } from '@/domain/content/search';
import { dueDuas } from '@/domain/learner/actions';
import { describeDue } from '@/domain/srs/scheduler';
import { cn } from '@/components/ui/cn';
import { TextInput } from '@/components/ui/Field';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { ReviewBadge } from '@/components/content/ReviewInfo';
import { useLearner } from '@/app/learner';
import { useDuaCategories, useDuas } from '@/app/queries';

export function DuasPage() {
  const { state, today } = useLearner();
  const [params, setParams] = useSearchParams();
  const duas = useDuas();
  const categories = useDuaCategories();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const category = params.get('category');
  const due = dueDuas(state, today);

  const setCategory = (slug: string | null) => {
    const next = new URLSearchParams(params);
    if (slug) next.set('category', slug);
    else next.delete('category');
    setParams(next, { replace: true });
  };

  if (duas.isLoading || categories.isLoading) return <LoadingState label="Loading duas…" />;
  if (duas.isError || categories.isError) return <ErrorState message="The dua library couldn’t be loaded." onRetry={() => duas.refetch()} />;

  const all = duas.data!;
  const cats = categories.data!;
  const results = filterDuas(all, cats, { query: deferred, category });
  const countFor = (slug: string) => all.filter((d) => d.categories.includes(slug)).length;
  const titleOf = (id: string) => all.find((d) => d.id === id);

  return (
    <div>
      <PageHeader title="Duas" description="Supplications for daily life — each with its source, grading where relevant, and review status." />

      {due.length > 0 && (
        <Section title="Due for revision" id="due">
          <ul className="space-y-2">
            {due.map((d) => {
              const dua = titleOf(d.duaId);
              if (!dua) return null;
              return (
                <li key={d.duaId}>
                  <Link to={`/duas/${dua.slug}?practice=1`} className="flex justify-between gap-3 rounded-xl border border-line bg-surface p-3.5 hover:border-line-strong">
                    <span className="font-medium">{dua.title}</span>
                    <span className="text-sm text-muted">{describeDue(d.srs, today)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {all.length === 0 ? (
        <EmptyState icon={<HandHeart aria-hidden className="size-6" />} title="No reviewed duas have been published yet">
          A dua appears here only after its Arabic text has been checked against its source, its grading attributed, and a reviewer has approved it. The
          categories below are ready for that content.{' '}
          <Link to="/sources#review" className="font-medium text-primary underline underline-offset-2">
            How content is reviewed
          </Link>
        </EmptyState>
      ) : (
        <div className="relative mb-4 max-w-md">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <label htmlFor="dua-search" className="sr-only">
            Search duas
          </label>
          <TextInput id="dua-search" type="search" placeholder="Search duas" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
      )}

      <Section title="Browse by occasion" id="categories" description="Categories help you find duas; they are not an exhaustive list.">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!category}
            onClick={() => setCategory(null)}
            className={cn('min-h-10 rounded-full border px-4 text-sm font-medium', !category ? 'border-primary bg-primary text-on-primary' : 'border-line-strong bg-surface hover:bg-surface-2')}
          >
            All
          </button>
          {cats.map((c) => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={category === c.slug}
              onClick={() => setCategory(category === c.slug ? null : c.slug)}
              className={cn(
                'min-h-10 rounded-full border px-4 text-sm font-medium',
                category === c.slug ? 'border-primary bg-primary text-on-primary' : 'border-line-strong bg-surface hover:bg-surface-2',
              )}
            >
              {c.title} <span className="opacity-75">({countFor(c.slug)})</span>
            </button>
          ))}
        </div>
      </Section>

      {all.length > 0 && (
        <Section title={category ? (cats.find((c) => c.slug === category)?.title ?? 'Duas') : 'All duas'} id="results">
          <p className="sr-only" role="status" aria-live="polite">
            {results.length} duas shown
          </p>
          {results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-muted">
              {category && !deferred ? 'No reviewed duas in this category yet.' : `No duas match “${deferred}”.`}
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {results.map((d) => {
                const progress = state.duas[d.id];
                return (
                  <li key={d.id}>
                    <Link to={`/duas/${d.slug}`} className="flex h-full flex-col rounded-2xl border border-line bg-surface p-4 shadow-card hover:border-line-strong">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <ReviewBadge item={d} />
                        {d.authenticity && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <ShieldCheck aria-hidden className="size-3.5" /> {d.authenticity.grade}
                          </span>
                        )}
                      </span>
                      <span className="mt-2 font-semibold">{d.title}</span>
                      <span className="mt-0.5 flex-1 text-sm text-muted">{d.usage}</span>
                      {progress && <span className="mt-2 text-xs text-muted">Practised · {describeDue(progress.srs, today)}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}
