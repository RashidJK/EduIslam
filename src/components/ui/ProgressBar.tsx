import { cn } from './cn';

export function ProgressBar({
  value,
  max = 100,
  label,
  valueText,
  className,
  tone = 'primary',
}: {
  value: number;
  max?: number;
  label: string;
  valueText?: string;
  className?: string;
  tone?: 'primary' | 'gold' | 'sage';
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const fill = tone === 'gold' ? 'bg-gold-line' : tone === 'sage' ? 'bg-sage' : 'bg-primary';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-valuetext={valueText}
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}
