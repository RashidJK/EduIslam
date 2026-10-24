import type { SalahGuide } from '@/domain/content/library';

export const PRACTICE_LABELS: Record<SalahGuide['practiceType'], string> = {
  obligatory: 'Obligatory (fard)',
  sunnah: 'Sunnah',
  voluntary: 'Voluntary (nafl)',
  general: 'General guidance',
};
