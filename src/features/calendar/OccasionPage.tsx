import { Link, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { hijriMonthName, uncertaintyNote } from '@/domain/hijri/calendar';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ContentSections } from '@/components/content/ContentSections';
import { ReviewDetails, SourceList } from '@/components/content/ReviewInfo';
import { NotFoundPage } from '@/features/errors/ErrorPages';
import { useLearner } from '@/app/learner';
import { useOccasionContent } from '@/app/queries';
import { occurrenceLabel } from './occurrence';
import { useHijriOptions, useUpcomingOccasions } from './useHijri';

export function OccasionPage() {
  const { slug } = useParams();
  const { today } = useLearner();
  const opts = useHijriOptions();
  const upcoming = useUpcomingOccasions();
  const content = useOccasionContent(slug);

  if (upcoming.isLoading || content.isLoading) return <LoadingState />;
  if (upcoming.isError || content.isError) return <ErrorState message="This occasion couldn’t be loaded." />;
  const occasion = upcoming.data?.find((o) => o.slug === slug);
  if (!occasion) return <NotFoundPage />;
  const c = content.data;

  return (
    <div className="max-w-3xl">
      <Link to="/calendar" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" /> Calendar
      </Link>
      <p className="text-sm font-medium text-gold">{hijriMonthName(occasion.rule.month)}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{occasion.title}</h1>

      <Card className="mt-5">
        <p className="font-medium">{occurrenceLabel(occasion.occurrence.start, occasion.occurrence.end, today, occasion.occurrence.ongoing)} (estimated)</p>
        {occasion.ruleNote && <p className="mt-1 text-sm text-muted">{occasion.ruleNote}</p>}
        <p className="mt-2 text-sm text-muted">{uncertaintyNote(opts)}</p>
      </Card>

      {c ? (
        <>
          <p className="mt-6 text-lg">{c.summary}</p>
          <div className="mt-5">
            <ContentSections sections={c.sections} sources={c.sources} />
          </div>
          {c.relatedDuaSlugs.length > 0 && (
            <section className="mt-8" aria-labelledby="related-duas">
              <h2 id="related-duas" className="text-lg font-semibold">
                Related duas
              </h2>
              <ul className="mt-2 list-disc pl-5">
                {c.relatedDuaSlugs.map((d) => (
                  <li key={d}>
                    <Link to={`/duas/${d}`} className="text-primary underline underline-offset-2">
                      {d}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="occasion-sources" className="mt-8">
            <h2 id="occasion-sources" className="text-lg font-semibold">
              Sources and review
            </h2>
            <div className="mt-3">
              <SourceList sources={c.sources} />
            </div>
            <div className="mt-4">
              <ReviewDetails item={c} />
            </div>
          </section>
        </>
      ) : (
        <Notice tone="info" className="mt-6">
          Learning content for {occasion.title} is being prepared and reviewed. Until it is published, only its estimated date is shown here.
        </Notice>
      )}
    </div>
  );
}
