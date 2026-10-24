import {
  BookOpen,
  Brain,
  CalendarDays,
  ChartNoAxesColumn,
  GraduationCap,
  HandHeart,
  Headphones,
  House,
  Library,
  ScrollText,
  Settings,
  ShieldCheck,
  Sunrise,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { to: '/app', label: 'Home', icon: House },
  { to: '/learn', label: 'Learn', icon: GraduationCap },
  { to: '/quran', label: 'Quran', icon: BookOpen },
  { to: '/duas', label: 'Duas', icon: HandHeart },
  { to: '/salah', label: 'Salah', icon: Sunrise },
  { to: '/stories', label: 'Stories', icon: ScrollText },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { to: '/memorization', label: 'Memorization', icon: Brain },
  { to: '/listening', label: 'Listening', icon: Headphones },
  { to: '/knowledge', label: 'Islamic Knowledge', icon: Library },
  { to: '/progress', label: 'Progress', icon: ChartNoAxesColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/sources', label: 'Sources & methodology', icon: ShieldCheck },
];

/** The compact mobile bar; everything else lives in the "More" sheet. */
export const MOBILE_BAR: readonly NavItem[] = PRIMARY_NAV.slice(0, 4);
export const MOBILE_MORE: readonly NavItem[] = [...PRIMARY_NAV.slice(4), ...SECONDARY_NAV];
