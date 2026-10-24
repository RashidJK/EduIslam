import { useEffect } from 'react';
import { Link } from 'react-router';
import { CalendarDays, Settings } from 'lucide-react';
import { formatHijri, HIJRI_METHOD_INFO, HIJRI_MONTHS, uncertaintyNote } from '@/domain/hijri/calendar';
import { recordActivity } from '@/domain/learner/actions';
import { formatDateKey } from '@/domain/time';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { Notice } from '@/components/ui/Notice';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useLearner } from '@/app/learner';
import { occurrenceLabel } from './occurrence';
import { useTodayHijri, useUpcomingOccasions } from './useHijri';

export function CalendarPage() {
  const { today, update } = useLearner();
  const { date, opts } = useTodayHijri();
  const upcoming = useUpcomingOccasions();

  // Count a visit to the calendar once per day towards the daily plan.
  useEffect(() => {
    update(['activity', 'plans'], (s, now) => (s.activity[today]?.records.some((r) => r.type === 'calendar') ? s : recordActivity(s, { type: 'calendar', ref: '*', minutes: 1 }, now)));
  }, [today, update]);

  return (
    <div>
      <PageHeader title="Islamic calendar" description="The Hijri months and the occasions within them." />

      {!date ? (
        <ErrorState
          title="The Hijri date isn’t available on this device"
          message={
            <>
              Your browser can’t calculate dates with the selected method. Try another method in{' '}
              <Link to="/settings#hijri" className="font-medium text-primary underline">
                Settings
              </Link>
              .
            </>
          }
        />
      ) : (
        <Card className="flex flex-wrap items-center gap-5 p-6">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gold-soft text-gold">
            <CalendarDays aria-hidden className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Today (estimated)</p>
            <p className="text-2xl font-semibold">{formatHijri(date)}</p>
            <p className="text-muted">{formatDateKey(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <Link to="/settings#hijri" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <Settings aria-hidden className="size-4" /> {HIJRI_METHOD_INFO[opts.method].label}
            {opts.dayAdjustment !== 0 && ` (${opts.dayAdjustment > 0 ? '+' : ''}${opts.dayAdjustment})`}
          </Link>
        </Card>
      )}
      <Notice tone="warning" className="mt-4">
        {uncertaintyNote(opts)}
      </Notice>

      <Section title="Upcoming occasions" id="upcoming">
        {upcoming.isLoading && <LoadingState />}
        {upcoming.isError && <ErrorState message="Occasions couldn’t be loaded." />}
        {upcoming.data && upcoming.data.length === 0 && <p className="text-sm text-muted">No occasions can be estimated on this device.</p>}
        {upcoming.data && upcoming.data.length > 0 && (
          <ul className="space-y-2">
            {upcoming.data.map((o) => (
              <li key={o.slug}>
                <Link to={`/calendar/${o.slug}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface p-4 hover:border-line-strong">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{o.title}</span>
                    <span className="block text-sm text-muted">{occurrenceLabel(o.occurrence.start, o.occurrence.end, today, o.occurrence.ongoing)}</span>
                  </span>
                  {o.occurrence.ongoing ? <Badge tone="gold">Now</Badge> : <Badge>Estimated</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="The twelve months" id="months">
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {HIJRI_MONTHS.map((m, i) => {
            const current = date?.month === i + 1;
            return (
              <li key={m}>
                <Link
                  to={`/calendar/months/${i + 1}`}
                  aria-current={current ? 'date' : undefined}
                  className={cn('flex items-center gap-3 rounded-xl border p-3 hover:border-line-strong', current ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-sm font-semibold tabular-nums text-muted">{i + 1}</span>
                  <span className="font-medium">{m}</span>
                  {current && <span className="ml-auto text-xs font-semibold text-primary">Current month</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </Section>
    </div>
  );
}
