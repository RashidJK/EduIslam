import type { ReactNode } from 'react';
import { CircleAlert, LoaderCircle, WifiOff } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';

export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex items-center justify-center gap-3 py-12 text-muted', className)}>
      <LoaderCircle aria-hidden className="size-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  offline = false,
  className,
}: {
  title?: string;
  message: ReactNode;
  onRetry?: () => void;
  offline?: boolean;
  className?: string;
}) {
  const Icon = offline ? WifiOff : CircleAlert;
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-10 text-center', className)}>
      <Icon aria-hidden className="size-8 text-error" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="max-w-prose text-muted">{message}</div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center', className)}>
      {icon && <span className="flex size-12 items-center justify-center rounded-2xl bg-sage-soft text-sage">{icon}</span>}
      <h2 className="text-base font-semibold">{title}</h2>
      {children && <div className="max-w-prose text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}
