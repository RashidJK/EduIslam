import { Link } from 'react-router';
import { Award, Circle } from 'lucide-react';
import { describeDue } from '@/domain/srs/scheduler';
import { dueDuas, dueMemorization } from '@/domain/learner/actions';
import { getSurahMeta } from '@/domain/quran/metadata';
import { MEMORIZATION_STATUSES, MEMORIZATION_STATUS_LABELS, passageLabel } from '@/domain/memorization/status';
import {
  achievements,
  activeDayCount,
  coursesCompleted,
  lessonsCompleted,
  lessonsCompletedThisWeek,
  memorizationCounts,
  surahsCompleted,
  totalMinutes,
  weeklyActivity,
} from '@/domain/progress/stats';
import { formatDateKey } from '@/domain/time';
import { Card } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLearner } from '@/app/learner';
import { useCourses, useDuas } from '@/app/queries';

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        {hint && <span className="mt-0.5 block text-xs font-normal text-muted">{hint}</span>}
      </dd>
    </div>
  );
}

export function ProgressPage() {
  const { state, today } = useLearner();
  const courses = useCourses();
  const duas = useDuas();
  const week = weeklyActivity(state, today);
  const maxMinutes = Math.max(state.preferences.dailyMinutes, ...week.map((d) => d.minutes));
  const memo = memorizationCounts(state);
  const duePassages = dueMemorization(state, today);
  const duaDue = dueDuas(state, today);
  const duaTitle = (id: string) => duas.data?.find((d) => d.id === id)?.title ?? 'Dua';
  const weekTarget = state.preferences.weeklyLessonTarget;
  const weekLessons = lessonsCompletedThisWeek(state, today);
  const reading = state.reading.current;
  const readingSurah = reading ? getSurahMeta(reading.surah) : undefined;
  const salahDone = Object.values(state.salahProgress).filter((s) => s.completed).length;
  const storiesStarted = Object.keys(state.storyProgress).length;

  return (
    <div>
      <PageHeader title="Progress" description="A private record of your learning in this app. It describes activity, not faith." />

      <Section title="Overview" id="overview">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Lessons completed" value={lessonsCompleted(state)} />
          <Stat label="Learning time" value={`${totalMinutes(state)} min`} hint="Estimated from completed activities" />
          <Stat label="Days with learning" value={activeDayCount(state)} />
          <Stat label="Courses completed" value={courses.data ? coursesCompleted(state, courses.data).length : '—'} />
        </dl>
      </Section>

      <Section title="This week" id="week" description="Minutes are approximate.">
        <Card>
          <ol className="flex h-40 items-end gap-2" aria-label="Learning minutes per day this week">
            {week.map((d) => (
              <li key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-xs text-muted tabular-nums">{d.minutes > 0 ? d.minutes : ''}</span>
                <span
                  className={cn('w-full max-w-10 rounded-t-lg', d.active ? 'bg-primary' : 'bg-surface-2', d.date === today && 'ring-2 ring-gold-line')}
                  style={{ height: `${Math.max(4, (d.minutes / maxMinutes) * 100)}%` }}
                  aria-hidden
                />
                <span className="text-xs text-muted">
                  {formatDateKey(d.date, { weekday: 'short' })}
                  <span className="sr-only">: {d.minutes} minutes</span>
                </span>
              </li>
            ))}
          </ol>
          {weekTarget && (
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium">Weekly lesson target</span>
                <span className="text-muted">
                  {weekLessons} of {weekTarget}
                </span>
              </div>
              <ProgressBar value={Math.min(weekLessons, weekTarget)} max={weekTarget} label="Weekly lesson target" valueText={`${weekLessons} of ${weekTarget} lessons`} />
            </div>
          )}
        </Card>
      </Section>

      <Section title="Quran" id="quran" description="Reading and memorization are tracked separately.">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="font-semibold">Reading</h3>
            <p className="mt-1 text-sm text-muted">
              {reading && readingSurah ? (
                <>
                  Last read: <Link to={`/quran/${reading.surah}?verse=${reading.verse}`} className="font-medium text-primary hover:underline">{readingSurah.nameTransliterated} {reading.surah}:{reading.verse}</Link>
                </>
              ) : (
                'No reading recorded yet.'
              )}
            </p>
            <p className="mt-2 text-sm">Surahs read to the end: {surahsCompleted(state)} of 114</p>
            <p className="mt-1 text-sm">Bookmarked verses: {state.bookmarks.filter((b) => b.kind === 'verse').length}</p>
          </Card>
          <Card>
            <h3 className="font-semibold">Memorization</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {MEMORIZATION_STATUSES.filter((s) => s !== 'not-started' || memo[s] > 0).map((s) => (
                <li key={s} className="flex justify-between">
                  <span>{MEMORIZATION_STATUS_LABELS[s]}</span>
                  <span className="tabular-nums">{memo[s]}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section title="Revision queue" id="revision" description="Items due today or earlier.">
        {duePassages.length + duaDue.length === 0 ? (
          <p className="text-sm text-muted">Nothing is due. Items appear here when it’s time to revise them.</p>
        ) : (
          <ul className="space-y-2">
            {duePassages.map((m) => (
              <li key={m.id}>
                <Link to={`/memorization/${m.id}`} className="flex justify-between gap-3 rounded-xl border border-line bg-surface p-3.5 hover:border-line-strong">
                  <span className="font-medium">{passageLabel(getSurahMeta(m.surah)?.nameTransliterated ?? '', m.surah, m.fromVerse, m.toVerse)}</span>
                  <span className="text-sm text-muted">{describeDue(m.srs, today)}</span>
                </Link>
              </li>
            ))}
            {duaDue.map((d) => (
              <li key={d.duaId} className="flex justify-between gap-3 rounded-xl border border-line bg-surface p-3.5">
                <span className="font-medium">{duaTitle(d.duaId)}</span>
                <span className="text-sm text-muted">{describeDue(d.srs, today)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Other learning" id="other">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Duas practised" value={Object.keys(state.duas).length} />
          <Stat label="Salah guides completed" value={salahDone} />
          <Stat label="Stories started" value={storiesStarted} />
          <Stat label="Recitations listened to" value={state.listening.history.length} />
        </dl>
      </Section>

      <Section title="Milestones" id="milestones" description="Optional and private. They mark steps in your learning here — nothing more.">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements(state, courses.data ?? []).map((a) => (
            <li key={a.id} className={cn('flex items-start gap-3 rounded-2xl border p-4', a.earned ? 'border-gold-line/60 bg-gold-soft' : 'border-line bg-surface')}>
              {a.earned ? <Award aria-hidden className="size-6 shrink-0 text-gold" /> : <Circle aria-hidden className="size-6 shrink-0 text-line-strong" />}
              <div>
                <p className="font-medium">
                  {a.title}
                  <span className="sr-only">{a.earned ? ', reached' : ', not yet'}</span>
                </p>
                <p className="text-sm text-muted">{a.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
