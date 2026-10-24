export const GOAL_IDS = [
  'arabic-reading',
  'quran-reading',
  'quran-memorization',
  'quran-meaning',
  'duas',
  'salah',
  'prophets-stories',
  'islamic-history',
  'foundations',
  'hijri-calendar',
  'daily-habit',
] as const;

export type GoalId = (typeof GOAL_IDS)[number];

export interface GoalDefinition {
  id: GoalId;
  label: string;
  description: string;
}

export const GOALS: readonly GoalDefinition[] = [
  { id: 'arabic-reading', label: 'Learn to read Arabic / Quran', description: 'Letters, sounds, and reading practice.' },
  { id: 'quran-reading', label: 'Read the Quran regularly', description: 'Pick up where you left off each day.' },
  { id: 'quran-memorization', label: 'Memorize and revise Quran', description: 'Guided memorization with spaced revision.' },
  { id: 'quran-meaning', label: 'Understand Quran vocabulary and meaning', description: 'Words and meanings, step by step.' },
  { id: 'duas', label: 'Learn duas for daily occasions', description: 'Supplications with sources and practice.' },
  { id: 'salah', label: 'Learn how to perform Salah', description: 'Steps of prayer and the meaning of its words.' },
  { id: 'prophets-stories', label: 'Study stories of the Prophets', description: 'Chapter-by-chapter, with references.' },
  { id: 'islamic-history', label: 'Learn Islamic history', description: 'The early community and later civilizations.' },
  { id: 'foundations', label: 'Learn foundational Islamic knowledge', description: 'Pillars, beliefs, character, and practice.' },
  { id: 'hijri-calendar', label: 'Follow the Hijri calendar', description: 'Months and important occasions.' },
  { id: 'daily-habit', label: 'Build a consistent daily habit', description: 'A small, realistic plan each day.' },
];

export function goalLabel(id: GoalId): string {
  return GOALS.find((g) => g.id === id)?.label ?? id;
}
