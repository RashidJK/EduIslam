import { Link } from 'react-router';
import { BookOpen, Info, MessageSquareQuote, ScrollText, TriangleAlert } from 'lucide-react';
import type { z } from 'zod';
import type { StorySectionSchema } from '@/domain/content/library';
import type { SourceRef } from '@/domain/content/schema';
import { getSurahMeta } from '@/domain/quran/metadata';
import { cn } from '@/components/ui/cn';

type Section = z.infer<typeof StorySectionSchema>;

/** Every passage says what kind of claim it is, so Quran, hadith, history and commentary are never blurred. */
const SECTION_KIND: Record<Section['kind'], { label: string; icon: typeof BookOpen; className: string }> = {
  quran: { label: 'From the Quran', icon: BookOpen, className: 'border-l-primary' },
  hadith: { label: 'From hadith', icon: MessageSquareQuote, className: 'border-l-gold-line' },
  historical: { label: 'Later historical account', icon: ScrollText, className: 'border-l-sage' },
  commentary: { label: 'Commentary', icon: Info, className: 'border-l-line-strong' },
};

function QuranRefLink({ value }: { value: string }) {
  const [surah, verses] = value.split(':') as [string, string];
  const from = verses.split('-')[0];
  const meta = getSurahMeta(Number(surah));
  return (
    <Link to={`/quran/${surah}?verse=${from}`} className="font-medium text-primary underline underline-offset-2">
      {meta?.nameTransliterated ?? 'Surah'} {value}
    </Link>
  );
}

export function ContentSections({ sections, sources }: { sections: readonly Section[]; sources: readonly SourceRef[] }) {
  const sourceTitle = (id: string) => sources.find((s) => s.id === id)?.title ?? id;
  return (
    <div className="space-y-5">
      {sections.map((s, i) => {
        const kind = SECTION_KIND[s.kind];
        const Icon = kind.icon;
        return (
          <article key={i} className={cn('rounded-r-xl border-l-4 bg-surface py-1 pl-4', kind.className)}>
            <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
              <Icon aria-hidden className="size-3.5" /> {kind.label}
            </p>
            <p className="text-[1.04rem] leading-relaxed whitespace-pre-line">{s.text}</p>
            {s.quranRefs && s.quranRefs.length > 0 && (
              <p className="mt-2 text-sm">
                Read in the Quran:{' '}
                {s.quranRefs.map((r, j) => (
                  <span key={r}>
                    {j > 0 && ', '}
                    <QuranRefLink value={r} />
                  </span>
                ))}
              </p>
            )}
            {s.differenceNote && (
              <p className="mt-2 flex gap-1.5 rounded-lg bg-warning-soft p-2.5 text-sm">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
                <span>
                  <span className="font-semibold">Accounts differ: </span>
                  {s.differenceNote}
                </span>
              </p>
            )}
            <p className="mt-2 text-xs text-muted">Source: {s.sourceIds.map(sourceTitle).join('; ')}</p>
          </article>
        );
      })}
    </div>
  );
}
