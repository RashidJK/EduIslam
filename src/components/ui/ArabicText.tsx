import type { ElementType, ReactNode } from 'react';
import { cn } from './cn';

/**
 * Renders Arabic with correct language and direction. `quran` uses the Quranic font and
 * spacing and must only ever receive text from the Quran provider.
 */
export function ArabicText({
  children,
  variant = 'arabic',
  as: As = 'p',
  className,
}: {
  children: ReactNode;
  variant?: 'quran' | 'arabic' | 'inline';
  as?: ElementType;
  className?: string;
}) {
  const cls = variant === 'quran' ? 'quran-text' : variant === 'inline' ? 'arabic-inline' : 'arabic-text';
  return (
    <As lang="ar" dir="rtl" className={cn(cls, 'text-ink', variant !== 'inline' && 'text-right', className)}>
      {children}
    </As>
  );
}
