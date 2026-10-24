import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from './cn';

const styles = {
  info: { box: 'bg-info-soft text-ink border-info/25', icon: Info, iconClass: 'text-info', label: 'Note' },
  success: { box: 'bg-success-soft text-ink border-success/25', icon: CircleCheck, iconClass: 'text-success', label: 'Success' },
  warning: { box: 'bg-warning-soft text-ink border-warning/25', icon: TriangleAlert, iconClass: 'text-warning', label: 'Important' },
  error: { box: 'bg-error-soft text-ink border-error/25', icon: CircleAlert, iconClass: 'text-error', label: 'Problem' },
} as const;

/** An inline message. Tone is conveyed by icon and hidden label as well as colour. */
export function Notice({
  tone = 'info',
  title,
  children,
  onDismiss,
  className,
  live = false,
}: {
  tone?: keyof typeof styles;
  title?: ReactNode;
  children?: ReactNode;
  onDismiss?: () => void;
  className?: string;
  live?: boolean;
}) {
  const s = styles[tone];
  const Icon = s.icon;
  return (
    <div role={live ? (tone === 'error' ? 'alert' : 'status') : undefined} className={cn('flex gap-3 rounded-xl border p-3.5 text-sm', s.box, className)}>
      <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', s.iconClass)} />
      <div className="min-w-0 flex-1">
        <span className="sr-only">{s.label}: </span>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-ink/85')}>{children}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="-m-1 rounded-lg p-1 hover:bg-black/5" aria-label="Dismiss">
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
