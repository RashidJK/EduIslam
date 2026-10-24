import { useId, useState } from 'react';
import { Link } from 'react-router';
import { ArrowDown, ArrowUp, CircleCheck, Clock, EllipsisVertical, RefreshCw, Shuffle, SkipForward, Trash2, Undo2 } from 'lucide-react';
import type { PlanItem } from '@/domain/learner/schema';
import { planTotals } from '@/domain/plan/engine';
import { minutesToday } from '@/domain/progress/stats';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { Notice } from '@/components/ui/Notice';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useLearner } from '@/app/learner';
import { ACTIVITY_META } from './activityMeta';
import { useDailyPlan } from './useDailyPlan';

function PlanRow({
  item,
  index,
  count,
  onEdit,
  onSwap,
}: {
  item: PlanItem;
  index: number;
  count: number;
  onEdit: ReturnType<typeof useDailyPlan>['edit'];
  onSwap: (id: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [swapFailed, setSwapFailed] = useState(false);
  const menuId = useId();
  const meta = ACTIVITY_META[item.type];
  const Icon = meta.icon;
  const done = item.status === 'done';
  const skipped = item.status === 'skipped';

  return (
    <li className={cn('rounded-xl border border-line bg-surface', skipped && 'opacity-70')}>
      <div className="flex items-center gap-3 p-3">
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', done ? 'bg-success-soft text-success' : 'bg-primary-soft text-primary')}>
          {done ? <CircleCheck aria-hidden className="size-5" /> : <Icon aria-hidden className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">
            {meta.label}
            {done && <span className="text-success"> · Done</span>}
            {skipped && <span> · Skipped today</span>}
          </p>
          {skipped ? (
            <p className={cn('font-medium', 'line-through decoration-muted/60')}>{item.title}</p>
          ) : (
            <Link to={item.href} className="font-medium hover:underline">
              {item.title}
            </Link>
          )}
          <p className="text-sm text-muted">{item.reason}</p>
        </div>
        <span className="hidden items-center gap-1 text-sm whitespace-nowrap text-muted sm:inline-flex">
          <Clock aria-hidden className="size-4" />
          {item.minutes} min
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-muted hover:bg-surface-2"
          aria-label={`Options for ${item.title}`}
        >
          <EllipsisVertical aria-hidden className="size-5" />
        </button>
      </div>
      {open && (
        <div id={menuId} className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2">
          <Button size="sm" variant="ghost" icon={<ArrowUp aria-hidden className="size-4" />} disabled={index === 0} onClick={() => onEdit({ kind: 'move', itemId: item.id, direction: -1 })}>
            Move up
          </Button>
          <Button size="sm" variant="ghost" icon={<ArrowDown aria-hidden className="size-4" />} disabled={index === count - 1} onClick={() => onEdit({ kind: 'move', itemId: item.id, direction: 1 })}>
            Move down
          </Button>
          {!done && (
            <Button size="sm" variant="ghost" icon={<Shuffle aria-hidden className="size-4" />} onClick={() => setSwapFailed(!onSwap(item.id))}>
              Swap
            </Button>
          )}
          {skipped ? (
            <Button size="sm" variant="ghost" icon={<Undo2 aria-hidden className="size-4" />} onClick={() => onEdit({ kind: 'restore', itemId: item.id })}>
              Restore
            </Button>
          ) : (
            !done && (
              <Button size="sm" variant="ghost" icon={<SkipForward aria-hidden className="size-4" />} onClick={() => onEdit({ kind: 'skip', itemId: item.id })}>
                Skip today
              </Button>
            )
          )}
          <Button size="sm" variant="ghost" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => onEdit({ kind: 'remove', itemId: item.id })}>
            Remove
          </Button>
          {swapFailed && (
            <p role="status" className="w-full px-1 text-sm text-muted">
              No other suggestion is available right now.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function TodayPlan() {
  const { state, today } = useLearner();
  const { plan, loading, error, edit, swap, regenerate } = useDailyPlan();
  const goal = state.preferences.dailyMinutes;
  const done = minutesToday(state, today);

  if (error) return <ErrorState message="Today’s plan couldn’t be prepared." />;
  if (loading || !plan) return <LoadingState label="Preparing today’s plan…" />;

  const totals = planTotals(plan);
  const next = plan.items.find((i) => i.status === 'pending');
  const allDone = totals.activeCount > 0 && totals.doneCount === totals.activeCount;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Today’s plan</h2>
          <p className="text-sm text-muted">
            About {totals.plannedMinutes} minutes · a suggestion you can change
          </p>
        </div>
        {next ? (
          <ButtonLink to={next.href} aria-label={`${totals.doneCount > 0 ? 'Continue' : 'Start'} with: ${next.title}`}>
            {totals.doneCount > 0 ? 'Continue' : 'Start today’s plan'}
          </ButtonLink>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="font-medium">Daily goal</span>
          <span className="text-muted">
            {Math.min(done, 999)} of {goal} min
          </span>
        </div>
        <ProgressBar value={Math.min(done, goal)} max={goal} label="Daily learning time" valueText={`${done} of ${goal} minutes today`} tone="gold" />
        <p className="mt-1.5 text-xs text-muted">Time is estimated from the activities you complete.</p>
      </div>

      {allDone && (
        <Notice tone="success" className="mt-4">
          You’ve done everything planned for today. Anything more is a bonus.
        </Notice>
      )}

      {plan.items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Your plan is empty. Rebuild it to get fresh suggestions.</p>
      ) : (
        <ol className="mt-4 space-y-2" aria-label="Today’s activities">
          {plan.items.map((item, i) => (
            <PlanRow key={item.id} item={item} index={i} count={plan.items.length} onEdit={edit} onSwap={swap} />
          ))}
        </ol>
      )}

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" icon={<RefreshCw aria-hidden className="size-4" />} onClick={regenerate}>
          Rebuild plan
        </Button>
      </div>
    </Card>
  );
}
