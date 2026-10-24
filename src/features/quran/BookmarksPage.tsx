import { Link } from 'react-router';
import { Bookmark, ChevronLeft, Trash2 } from 'lucide-react';
import { removeBookmark } from '@/domain/learner/actions';
import { getSurahMeta, parseVerseKey } from '@/domain/quran/metadata';
import { formatDateKey } from '@/domain/time';
import { IconButton } from '@/components/ui/Button';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/States';
import { useLearner } from '@/app/learner';

export function BookmarksPage() {
  const { state, update } = useLearner();
  const verses = state.bookmarks.filter((b) => b.kind === 'verse');
  const recent = Object.entries(state.reading.surahs)
    .map(([surah, r]) => ({ surah: Number(surah), ...r }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 10);

  return (
    <div className="max-w-3xl">
      <Link to="/quran" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" /> Quran
      </Link>
      <PageHeader title="Bookmarks and recent reading" />

      <Section title="Bookmarked verses" id="bookmarks">
        {verses.length === 0 ? (
          <EmptyState icon={<Bookmark aria-hidden className="size-6" />} title="No bookmarks yet">
            Use the bookmark button beside any verse to save it here.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {verses.map((b) => {
              const ref = parseVerseKey(b.ref);
              const meta = ref ? getSurahMeta(ref.surah) : undefined;
              if (!ref || !meta) return null;
              return (
                <li key={b.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                  <Link to={`/quran/${ref.surah}?verse=${ref.verse}`} className="min-w-0 flex-1 hover:underline">
                    <span className="block font-medium">
                      {meta.nameTransliterated} {b.ref}
                    </span>
                    <span className="block text-sm text-muted">Saved {formatDateKey(b.createdAt.slice(0, 10))}</span>
                  </Link>
                  <IconButton label={`Remove bookmark ${meta.nameTransliterated} ${b.ref}`} onClick={() => update(['bookmarks'], (s) => removeBookmark(s, { kind: 'verse', ref: b.ref }))}>
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Recently read" id="recent">
        {recent.length === 0 ? (
          <p className="text-sm text-muted">Surahs you read will appear here, with the verse you reached.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => {
              const meta = getSurahMeta(r.surah)!;
              return (
                <li key={r.surah}>
                  <Link to={`/quran/${r.surah}?verse=${r.lastVerse}`} className="flex justify-between gap-3 rounded-xl border border-line bg-surface p-3 hover:border-line-strong">
                    <span className="font-medium">{meta.nameTransliterated}</span>
                    <span className="text-sm text-muted">
                      {r.completedOn ? 'Read to the end · ' : ''}verse {r.lastVerse} of {meta.verseCount}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
