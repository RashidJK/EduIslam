import type { ReactNode } from 'react';
import { cn } from './cn';

export type Tone = 'neutral' | 'primary' | 'gold' | 'success' | 'warning' | 'error' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  primary: 'bg-primary-soft text-primary border-transparent',
  gold: 'bg-gold-soft text-gold border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  error: 'bg-error-soft text-error border-transparent',
  info: 'bg-info-soft text-info border-transparent',
};

export function Badge({ tone = 'neutral', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
