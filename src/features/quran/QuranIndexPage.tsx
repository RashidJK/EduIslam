import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router';
import { Bookmark, Brain, CircleCheck, Headphones, Search } from 'lucide-react';
import { SURAHS } from '@/domain/quran/metadata';
import { searchSurahs } from '@/domain/quran/search';
import { ArabicText } from '@/components/ui/ArabicText';
import { LinkCard } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { useLearner } from '@/app/learner';

export function QuranIndexPage() {
  const { state } = useLearner();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const results = searchSurahs(deferred);
  const reading = state.reading.current;
  const current = reading ? SURAHS[reading.surah - 1] : undefined;

  return (
    <div>
      <PageHeader title="Quran" description="Read with an optional translation, listen verse by verse, and pick up where you left off." />

      <div className="grid gap-3 sm:grid-cols-3">
        {reading && current ? (
          <LinkCard to={`/quran/${reading.surah}?verse=${reading.verse}`} icon={<CircleCheck aria-hidden className="size-5" />} title={`Resume ${current.nameTransliterated}`} description={`Verse ${reading.verse} of ${current.verseCount}`} />
        ) : (
          <LinkCard to="/quran/1" icon={<CircleCheck aria-hidden className="size-5" />} title="Start reading" description="Begin with Al-Fatiha" />
        )}
        <LinkCard to="/quran/bookmarks" icon={<Bookmark aria-hidden className="size-5" />} title="Bookmarks" description={`${state.bookmarks.filter((b) => b.kind === 'verse').length} saved · recent reading`} />
        <LinkCard to="/memorization" icon={<Brain aria-hidden className="size-5" />} title="Memorization" description="Memorize and revise" />
      </div>

      <div className="mt-8 mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">All surahs</h2>
        <Link to="/listening" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <Headphones aria-hidden className="size-4" /> Listening library
        </Link>
      </div>
      <div className="relative mb-4 max-w-md">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <label htmlFor="surah-search" className="sr-only">
          Search surahs by name or number
        </label>
        <TextInput id="surah-search" type="search" placeholder="Search by name or number" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {deferred ? `${results.length} surahs found` : ''}
      </p>

      {results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-muted">No surah matches “{deferred}”. Try a number or another spelling.</p>
      ) : (
        <ol className="grid gap-2 md:grid-cols-2">
          {results.map((s) => {
            const progress = state.reading.surahs[String(s.number)];
            return (
              <li key={s.number}>
                <Link to={`/quran/${s.number}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 hover:border-line-strong">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm font-semibold tabular-nums text-muted">{s.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.nameTransliterated}</span>
                    <span className="block truncate text-sm text-muted">
                      {s.nameTranslated} · {s.verseCount} verses · {s.revelationType}
                      {progress?.completedOn ? ' · Read' : progress ? ` · up to verse ${progress.furthestVerse}` : ''}
                    </span>
                  </span>
                  <ArabicText variant="inline" as="span" className="shrink-0 text-xl">
                    {s.nameArabic}
                  </ArabicText>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
