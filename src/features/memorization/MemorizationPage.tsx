import { Link, useSearchParams } from 'react-router';
import { Brain, Plus } from 'lucide-react';
import { dueMemorization } from '@/domain/learner/actions';
import type { MemorizationItem } from '@/domain/learner/schema';
import { deriveMemorizationStatus, MEMORIZATION_STATUS_HELP, MEMORIZATION_STATUS_LABELS, MEMORIZATION_STATUSES, passageLabel } from '@/domain/memorization/status';
import { getSurahMeta } from '@/domain/quran/metadata';
import { describeDue } from '@/domain/srs/scheduler';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/States';
import { useLearner } from '@/app/learner';

function label(m: MemorizationItem) {
  return passageLabel(getSurahMeta(m.surah)?.nameTransliterated ?? `Surah ${m.surah}`, m.surah, m.fromVerse, m.toVerse);
}

function ItemRow({ item, today }: { item: MemorizationItem; today: string }) {
  const status = deriveMemorizationStatus(item.srs, item.history);
  return (
    <li>
      <Link to={`/memorization/${item.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4 hover:border-line-strong">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{label(item)}</span>
          <span className="block text-sm text-muted">
            {item.history.length === 0 ? 'Not practised yet' : `Practised ${item.history.length} time${item.history.length === 1 ? '' : 's'}`} · {describeDue(item.srs, today)}
          </span>
        </span>
        <Badge tone={status === 'consistently-recalled' ? 'success' : status === 'learning' || status === 'not-started' ? 'neutral' : 'primary'}>{MEMORIZATION_STATUS_LABELS[status]}</Badge>
      </Link>
    </li>
  );
}

export function MemorizationPage() {
  const { state, today } = useLearner();
  const [params] = useSearchParams();
  const active = state.memorization.filter((m) => !m.archived);
  const due = dueMemorization(state, today);
  const dueIds = new Set(due.map((d) => d.id));
  const archived = state.memorization.filter((m) => m.archived);
  const onlyDue = params.get('view') === 'due';

  return (
    <div>
      <PageHeader
        title="Memorization"
        description="Memorize passages step by step, then revise them at growing intervals. Reading progress is tracked separately."
        actions={
          <ButtonLink to="/memorization/new" icon={<Plus aria-hidden className="size-4" />}>
            New passage
          </ButtonLink>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon={<Brain aria-hidden className="size-6" />}
          title="No passages yet"
          action={<ButtonLink to="/memorization/new">Choose a passage</ButtonLink>}
        >
          Pick a short passage — a few verses is plenty to begin. You can also start from any verse in the Quran reader.
        </EmptyState>
      ) : (
        <>
          <Section title="Due for revision" id="due" description={due.length ? `${due.length} passage${due.length === 1 ? '' : 's'}, about ${due.length * 2} minutes` : undefined}>
            {due.length === 0 ? (
              <p className="text-sm text-muted">Nothing is due today. Well-paced revision means some days are lighter.</p>
            ) : (
              <ul className="space-y-2">
                {due.map((m) => (
                  <ItemRow key={m.id} item={m} today={today} />
                ))}
              </ul>
            )}
          </Section>

          {!onlyDue && (
            <Section title="All passages" id="all">
              <ul className="space-y-2">
                {active
                  .filter((m) => !dueIds.has(m.id))
                  .map((m) => (
                    <ItemRow key={m.id} item={m} today={today} />
                  ))}
              </ul>
              {active.every((m) => dueIds.has(m.id)) && <p className="text-sm text-muted">All your passages are due above.</p>}
            </Section>
          )}
          {onlyDue && (
            <p className="mt-6 text-sm">
              <Link to="/memorization" className="font-medium text-primary underline underline-offset-2">
                Show all passages
              </Link>
            </p>
          )}
        </>
      )}

      <Section title="What the statuses mean" id="statuses">
        <dl className="grid gap-3 sm:grid-cols-2">
          {MEMORIZATION_STATUSES.map((s) => (
            <div key={s} className="rounded-xl border border-line bg-surface p-3">
              <dt className="font-medium">{MEMORIZATION_STATUS_LABELS[s]}</dt>
              <dd className="text-sm text-muted">{MEMORIZATION_STATUS_HELP[s]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-muted">Statuses come from your own recall ratings over time. They are a study aid, not a judgement.</p>
      </Section>

      {archived.length > 0 && (
        <Section title="Archived" id="archived">
          <ul className="space-y-2">
            {archived.map((m) => (
              <ItemRow key={m.id} item={m} today={today} />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
