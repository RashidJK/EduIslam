import { BookOpen, Brain, CalendarDays, GraduationCap, HandHeart, Headphones, ScrollText, Sunrise, type LucideIcon } from 'lucide-react';
import type { ActivityType } from '@/domain/learner/schema';

export const ACTIVITY_META: Record<ActivityType, { icon: LucideIcon; label: string }> = {
  'quran-reading': { icon: BookOpen, label: 'Quran reading' },
  listening: { icon: Headphones, label: 'Listening' },
  'memorization-review': { icon: Brain, label: 'Revision' },
  'memorization-new': { icon: Brain, label: 'Memorization' },
  'dua-practice': { icon: HandHeart, label: 'Dua practice' },
  lesson: { icon: GraduationCap, label: 'Lesson' },
  salah: { icon: Sunrise, label: 'Salah' },
  story: { icon: ScrollText, label: 'Story' },
  calendar: { icon: CalendarDays, label: 'Calendar' },
};
