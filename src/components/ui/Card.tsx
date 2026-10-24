import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from './cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-surface p-5 shadow-card', className)} {...rest} />;
}

/** A whole-card link with a clear title, used for navigation tiles and list rows. */
export function LinkCard({
  to,
  title,
  description,
  icon,
  meta,
  className,
}: {
  to: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong hover:bg-surface-2',
        className,
      )}
    >
      {icon && <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
        {meta && <span className="mt-1.5 block">{meta}</span>}
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
