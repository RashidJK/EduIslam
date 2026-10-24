import { BookOpen, ExternalLink, ShieldCheck, Info } from 'lucide-react';
import type { ContentBase, SourceRef } from '@/domain/content/schema';
import { formatDateKey } from '@/domain/time';
import { Badge } from '@/components/ui/Badge';

/** A short, honest label describing what kind of content this is and who reviewed it. */
export function ReviewBadge({ item }: { item: Pick<ContentBase, 'contentClass' | 'review'> }) {
  if (item.contentClass === 'religious' && item.review.reviewer) {
    return (
      <Badge tone="success" icon={<ShieldCheck aria-hidden className="size-3.5" />}>
        Reviewed
      </Badge>
    );
  }
  const label = item.contentClass === 'app-guide' ? 'App guide' : item.contentClass === 'linguistic' ? 'Language lesson' : item.contentClass === 'sample' ? 'Sample' : 'Not reviewed';
  return (
    <Badge tone="neutral" icon={<Info aria-hidden className="size-3.5" />}>
      {label}
    </Badge>
  );
}

/** Review provenance. Any `notice` is shown separately by the page, prominently. */
export function ReviewDetails({ item }: { item: Pick<ContentBase, 'contentClass' | 'review'> }) {
  const { review } = item;
  return (
    <div className="space-y-1 text-sm text-muted">
      {item.contentClass === 'religious' ? (
        <p>
          {review.reviewer ? (
            <>
              Reviewed by <span className="font-medium text-ink">{review.reviewer}</span>
              {review.reviewedOn && <> on {formatDateKey(review.reviewedOn)}</>}. Version {review.version}.
            </>
          ) : (
            'This content has not been reviewed.'
          )}
        </p>
      ) : (
        <p>
          {item.contentClass === 'app-guide' && 'This explains how the app works. It contains no religious teaching.'}
          {item.contentClass === 'linguistic' && 'A language lesson. It contains no religious rulings or narrations and has not been externally reviewed.'}
          {item.contentClass === 'sample' && 'Sample content for demonstration. It is not verified religious teaching.'}
        </p>
      )}
    </div>
  );
}

function sourceLine(s: SourceRef): string {
  return [s.author, s.collection, s.locator].filter(Boolean).join(' · ');
}

export function SourceList({ sources }: { sources: readonly SourceRef[] }) {
  if (sources.length === 0) return null;
  return (
    <ul className="space-y-2.5">
      {sources.map((s) => (
        <li key={s.id} className="flex gap-2.5 text-sm">
          <BookOpen aria-hidden className="mt-0.5 size-4 shrink-0 text-sage" />
          <div className="min-w-0">
            <p className="font-medium text-ink">
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 underline decoration-line-strong underline-offset-2 hover:decoration-primary">
                  {s.title}
                  <ExternalLink aria-hidden className="size-3.5" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                s.title
              )}
            </p>
            {sourceLine(s) && <p className="text-muted">{sourceLine(s)}</p>}
            {s.grading && (
              <p className="text-muted">
                Grading: {s.grading.grade} — {s.grading.gradedBy}
              </p>
            )}
            {s.notes && <p className="text-muted">{s.notes}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
