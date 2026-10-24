import { brand } from '@/config/brand';
import { cn } from '@/components/ui/cn';

/** A simple eight-pointed star mark. Kept geometric and understated. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-8', className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <g className="fill-gold-soft">
        <rect x="9.5" y="9.5" width="13" height="13" rx="0.8" />
        <rect x="9.5" y="9.5" width="13" height="13" rx="0.8" transform="rotate(45 16 16)" />
      </g>
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      {!compact && <span className="font-semibold tracking-tight text-ink">{brand.name}</span>}
      {compact && <span className="sr-only">{brand.name}</span>}
    </span>
  );
}
