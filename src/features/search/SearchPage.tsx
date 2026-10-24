import { useDeferredValue, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { TextInput } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useCourses, useDuaCategories, useDuas, useLessons, useOccasionDates, useSalahGuides, useSalahPaths, useStories } from '@/app/queries';
import { buildSearchIndex, runSearch, type SearchEntry } from './searchIndex';

function ReviewLabel({ review }: { review: NonNullable<SearchEntry['review']> }) {
  if (review.contentClass === 'religious') return <Badge tone={review.reviewed ? 'success' : 'neutral'}>{review.reviewed ? 'Reviewed' : 'Not reviewed'}</Badge>;
  return <Badge>{review.contentClass === 'app-guide' ? 'App guide' : review.contentClass === 'linguistic' ? 'Language lesson' : 'Sample'}</Badge>;
}

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const deferred = useDeferredValue(query);
  const queries = [useCourses(), useLessons(), useDuas(), useDuaCategories(), useSalahPaths(), useSalahGuides(), useStories(), useOccasionDates()] as const;
  const [courses, lessons, duas, duaCategories, salahPaths, salahGuides, stories, occasions] = queries;
  const ready = queries.every((q) => q.isSuccess);

  const index = useMemo(
    () =>
      ready
        ? buildSearchIndex({
            courses: courses.data!,
            lessons: lessons.data!,
            duas: duas.data!,
            duaCategories: duaCategories.data!,
            salahPaths: salahPaths.data!,
            salahGuides: salahGuides.data!,
            stories: stories.data!,
            occasions: occasions.data!,
          })
        : [],
    [ready, courses.data, lessons.data, duas.data, duaCategories.data, salahPaths.data, salahGuides.data, stories.data, occasions.data],
  );
  const results = useMemo(() => runSearch(index, deferred), [index, deferred]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Search" description="Find surahs, lessons, duas, Salah guides, stories, and calendar pages." />
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <label htmlFor="global-search" className="sr-only">
          Search everything
        </label>
        <TextInput
          id="global-search"
          type="search"
          autoFocus
          placeholder="Try “Kahf”, “letters”, or “Ramadan”"
          value={query}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          className="pl-10"
        />
      </div>

      {queries.some((q) => q.isError) && <ErrorState className="mt-6" message="Some content couldn’t be searched right now." />}
      {!ready && !queries.some((q) => q.isError) && <LoadingState />}
      <p className="sr-only" role="status" aria-live="polite">
        {deferred ? `${results.length} results` : ''}
      </p>

      {ready && deferred.trim() && (
        <>
          {results.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-line-strong p-6 text-center text-muted">
              Nothing matches “{deferred}”. Try another spelling — transliterations vary — or browse from the menu.
            </p>
          ) : (
            <ul className="mt-6 space-y-2" aria-label="Search results">
              {results.map((r) => (
                <li key={`${r.type}-${r.href}`}>
                  <Link to={r.href} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 hover:border-line-strong">
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-muted">{r.type}</span>
                      <span className="block font-medium">{r.title}</span>
                      {r.subtitle && <span className="block truncate text-sm text-muted">{r.subtitle}</span>}
                    </span>
                    {r.review && <ReviewLabel review={r.review} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
