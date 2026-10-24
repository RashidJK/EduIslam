import { Link, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { hijriMonthName, hijriMonthSpan, toHijri, uncertaintyNote } from '@/domain/hijri/calendar';
import { addDays, formatDateKey } from '@/domain/time';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { NotFoundPage } from '@/features/errors/ErrorPages';
import { useLearner } from '@/app/learner';
import { useHijriOptions, useUpcomingOccasions } from './useHijri';

export function MonthPage() {
  const { month: param } = useParams();
  const { today } = useLearner();
  const opts = useHijriOptions();
  const upcoming = useUpcomingOccasions();
  const month = Number(param);
  if (!Number.isInteger(month) || month < 1 || month > 12 || String(month) !== param) return <NotFoundPage />;

  const now = toHijri(today, opts);
  // The current occurrence of this month, or the next one.
  let span: { start: string; end: string } | null = null;
  let year: number | null = null;
  if (now) {
    year = month >= now.month ? now.year : now.year + 1;
    const around = addDays(today, Math.round(((year - now.year) * 12 + (month - now.month)) * 29.53));
    span = hijriMonthSpan(year, month, around, opts);
  }
  const occasions = upcoming.data?.filter((o) => o.rule.month === month) ?? [];

  return (
    <div className="max-w-3xl">
      <Link to="/calendar" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" /> Calendar
      </Link>
      <p className="text-sm font-medium text-gold">Month {month} of 12</p>
      <h1 className="text-3xl font-semibold tracking-tight">{hijriMonthName(month)}</h1>

      <Card className="mt-5">
        {span && year ? (
          <p>
            {now?.month === month ? 'This month' : 'Next'}: {hijriMonthName(month)} {year} AH — estimated from <span className="font-medium">{formatDateKey(span.start)}</span> to{' '}
            <span className="font-medium">{formatDateKey(span.end)}</span>.
          </p>
        ) : (
          <p className="text-muted">Dates for this month can’t be calculated on this device.</p>
        )}
        <p className="mt-2 text-sm text-muted">{uncertaintyNote(opts)}</p>
      </Card>

      <section aria-labelledby="month-occasions" className="mt-8">
        <h2 id="month-occasions" className="text-lg font-semibold">
          Occasions in {hijriMonthName(month)}
        </h2>
        {occasions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No occasions in this month are listed in the calendar yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {occasions.map((o) => (
              <li key={o.slug}>
                <Link to={`/calendar/${o.slug}`} className="block rounded-xl border border-line bg-surface p-3.5 font-medium hover:border-line-strong">
                  {o.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Notice tone="info" className="mt-8">
        Learning content about {hijriMonthName(month)} will appear here once it has been written with sources and reviewed.
      </Notice>
    </div>
  );
}
