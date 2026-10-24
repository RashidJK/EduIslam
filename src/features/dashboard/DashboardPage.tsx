import { Link, Navigate } from 'react-router';
import { BookOpen, Brain, CalendarDays, GraduationCap, HandHeart, Headphones, ScrollText, Sunrise } from 'lucide-react';
import { formatHijri, uncertaintyNote } from '@/domain/hijri/calendar';
import { dueDuas, dueMemorization } from '@/domain/learner/actions';
import { getSurahMeta } from '@/domain/quran/metadata';
import { memorizationCounts, weeklyActivity } from '@/domain/progress/stats';
import { MEMORIZATION_STATUS_LABELS } from '@/domain/memorization/status';
import { formatDateKey, diffDays } from '@/domain/time';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, LinkCard } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { Notice } from '@/components/ui/Notice';
import { Section } from '@/components/ui/PageHeader';
import { useLearner } from '@/app/learner';
import { useCourses, useLessons } from '@/app/queries';
import { useTodayHijri, useUpcomingOccasions } from '@/features/calendar/useHijri';
import { TodayPlan } from './TodayPlan';

function greeting(now: Date, timeZone: string): string {
  let hour = now.getHours();
  try {
    hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now));
  } catch {
    // keep host hour
  }
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function ReminderBanner() {
  const { state, today, now } = useLearner();
  const { enabled, time } = state.preferences.reminder;
  if (!enabled || state.activity[today]?.records.length) return null;
  const local = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: state.preferences.timeZone }).format(now());
  if (local < time) return null;
  return <Notice tone="info">A gentle reminder: your plan for today is ready whenever you are.</Notice>;
}

function ContinueCard() {
  const { state } = useLearner();
  const lessons = useLessons();
  const inProgress = Object.values(state.lessons)
    .filter((l) => l.status === 'in-progress')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const lesson = inProgress && lessons.data?.find((l) => l.id === inProgress.lessonId);
  const reading = state.reading.current;
  const surah = reading ? getSurahMeta(reading.surah) : undefined;

  // Pick the most recent unfinished thing as the single next action.
  const lessonFirst = lesson && (!reading || inProgress!.updatedAt > reading.updatedAt);
  if (lessonFirst) {
    return (
      <LinkCard to={`/lesson/${lesson.id}`} icon={<GraduationCap aria-hidden className="size-5" />} title={`Resume: ${lesson.title}`} description="You started this lesson. Pick up where you left off." />
    );
  }
  if (reading && surah) {
    return (
      <LinkCard
        to={`/quran/${reading.surah}?verse=${reading.verse}`}
        icon={<BookOpen aria-hidden className="size-5" />}
        title={`Continue ${surah.nameTransliterated}`}
        description={`From verse ${reading.verse} of ${surah.verseCount}`}
      />
    );
  }
  return <LinkCard to="/quran/1" icon={<BookOpen aria-hidden className="size-5" />} title="Begin reading" description="Start with Al-Fatiha, or choose any surah." />;
}

function RevisionCard() {
  const { state, today } = useLearner();
  const passages = dueMemorization(state, today);
  const duas = dueDuas(state, today);
  const total = passages.length + duas.length;
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold">
          <Brain aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Revision due</h2>
          {total === 0 ? (
            <p className="mt-0.5 text-sm text-muted">Nothing is due today. Items come back here when it’s time to revise them.</p>
          ) : (
            <>
              <p className="mt-0.5 text-sm text-muted">
                {passages.length > 0 && `${passages.length} passage${passages.length === 1 ? '' : 's'}`}
                {passages.length > 0 && duas.length > 0 && ' and '}
                {duas.length > 0 && `${duas.length} dua${duas.length === 1 ? '' : 's'}`} — about {passages.length * 2 + duas.length} minutes.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {passages.length > 0 && (
                  <ButtonLink to="/memorization?view=due" size="sm">
                    Revise passages
                  </ButtonLink>
                )}
                {duas.length > 0 && (
                  <ButtonLink to="/duas?view=due" size="sm" variant="secondary">
                    Revise duas
                  </ButtonLink>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function QuranProgressCard() {
  const { state } = useLearner();
  const reading = state.reading.current;
  const surah = reading ? getSurahMeta(reading.surah) : undefined;
  const counts = memorizationCounts(state);
  const active = Object.entries(counts).filter(([status, n]) => status !== 'not-started' && n > 0);
  return (
    <Card>
      <h2 className="font-semibold">Quran progress</h2>
      <dl className="mt-3 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium text-muted uppercase">Reading</dt>
          <dd className="mt-1 text-sm">{reading && surah ? `${surah.nameTransliterated}, verse ${reading.verse}` : 'Not started yet'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted uppercase">Bookmarks</dt>
          <dd className="mt-1 text-sm">
            <Link to="/quran/bookmarks" className="hover:underline">
              {state.bookmarks.filter((b) => b.kind === 'verse').length} saved
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted uppercase">Memorization</dt>
          <dd className="mt-1 text-sm">
            {active.length === 0 ? (
              <Link to="/memorization" className="hover:underline">
                No passages yet
              </Link>
            ) : (
              <ul className="space-y-0.5">
                {active.map(([status, n]) => (
                  <li key={status}>
                    {n} {MEMORIZATION_STATUS_LABELS[status as keyof typeof MEMORIZATION_STATUS_LABELS].toLowerCase()}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function CalendarPreview() {
  const { today } = useLearner();
  const { date, opts } = useTodayHijri();
  const upcoming = useUpcomingOccasions();
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Islamic calendar</h2>
          <p className="mt-0.5 text-sm text-muted">{date ? formatHijri(date) : 'The Hijri date isn’t available on this device.'}</p>
        </div>
        <Link to="/calendar" className="text-sm font-medium text-primary hover:underline">
          Open calendar
        </Link>
      </div>
      {upcoming.data && upcoming.data.length > 0 && (
        <ul className="mt-3 space-y-2">
          {upcoming.data.slice(0, 2).map((o) => {
            const days = diffDays(today, o.occurrence.start);
            return (
              <li key={o.slug} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link to={`/calendar/${o.slug}`} className="font-medium hover:underline">
                  {o.title}
                </Link>
                <span className="flex items-center gap-2 text-muted">
                  {o.occurrence.ongoing ? 'Now' : days === 1 ? 'Tomorrow' : `in ${days} days`} · {formatDateKey(o.occurrence.start)}
                  <Badge>Estimated</Badge>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">{uncertaintyNote(opts)}</p>
    </Card>
  );
}

function WeekActivity() {
  const { state, today } = useLearner();
  if (!state.preferences.display.showConsistency) return null;
  const week = weeklyActivity(state, today);
  const activeDays = week.filter((d) => d.active).length;
  return (
    <Card>
      <h2 className="font-semibold">This week</h2>
      <p className="mt-0.5 text-sm text-muted">
        {activeDays === 0 ? 'Every day is a fresh start.' : `You learned on ${activeDays} day${activeDays === 1 ? '' : 's'} this week.`}
      </p>
      <ol className="mt-3 flex gap-2" aria-label="Days with learning activity this week">
        {week.map((d) => {
          const label = formatDateKey(d.date, { weekday: 'short' });
          return (
            <li key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border text-xs',
                  d.active ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface-2 text-muted',
                  d.date === today && 'ring-2 ring-gold-line ring-offset-2 ring-offset-surface',
                )}
              >
                <span aria-hidden>{d.active ? '✓' : ''}</span>
              </span>
              <span className="text-xs text-muted">
                {label}
                <span className="sr-only">: {d.active ? `learned, about ${d.minutes} minutes` : 'no activity'}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

const EXPLORE = [
  { to: '/learn', icon: GraduationCap, title: 'Courses', description: 'Learning paths and lessons' },
  { to: '/duas', icon: HandHeart, title: 'Duas by occasion', description: 'Browse by category' },
  { to: '/salah', icon: Sunrise, title: 'Salah', description: 'Step-by-step learning' },
  { to: '/stories', icon: ScrollText, title: 'Stories', description: 'Prophets and history' },
  { to: '/calendar', icon: CalendarDays, title: 'Calendar', description: 'Hijri months and occasions' },
  { to: '/listening', icon: Headphones, title: 'Listening', description: 'Recitations by surah' },
];

export function DashboardPage() {
  const { state } = useLearner();
  if (state.profile.onboarding === 'not-started') return <Navigate to="/onboarding" replace />;
  return <Dashboard />;
}

function Dashboard() {
  const { state, now, today } = useLearner();
  const { date } = useTodayHijri();
  const courses = useCourses();
  const name = state.profile.displayName;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting(now(), state.preferences.timeZone)}
          {name ? `, ${name}` : ''}
        </h1>
        <p className="mt-1 text-muted">
          {formatDateKey(today, { weekday: 'long', day: 'numeric', month: 'long' })}
          {date && <> · {formatHijri(date)} (estimated)</>}
        </p>
      </header>

      {state.profile.onboarding === 'skipped' && (
        <Notice tone="info" title="Make the plan yours">
          You skipped setup, so your plan uses general suggestions.{' '}
          <Link to="/onboarding" className="font-medium text-primary underline underline-offset-2">
            Choose your goals
          </Link>{' '}
          whenever you like.
        </Notice>
      )}
      <ReminderBanner />

      <TodayPlan />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Continue learning</h2>
          <ContinueCard />
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Revision</h2>
          <RevisionCard />
        </div>
      </div>

      <QuranProgressCard />

      <div className="grid gap-4 md:grid-cols-2">
        <CalendarPreview />
        <WeekActivity />
      </div>

      <Section title="Explore" description={courses.data ? `${courses.data.length} courses available` : undefined}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXPLORE.map(({ to, icon: Icon, title, description }) => (
            <li key={to}>
              <LinkCard to={to} icon={<Icon aria-hidden className="size-5" />} title={title} description={description} />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
