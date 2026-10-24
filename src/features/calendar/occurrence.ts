import { diffDays, formatDateKey } from '@/domain/time';

/** "In 12 days · 8 Feb 2027" style label for an estimated occurrence. */
export function occurrenceLabel(start: string, end: string, today: string, ongoing: boolean): string {
  const range = start === end ? formatDateKey(start, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : `${formatDateKey(start)} – ${formatDateKey(end)}`;
  if (ongoing) return `Now · ${range}`;
  const days = diffDays(today, start);
  return `${days === 1 ? 'Tomorrow' : `In ${days} days`} · ${range}`;
}
