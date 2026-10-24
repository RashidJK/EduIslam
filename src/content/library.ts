// Bundled structure for the dua, Salah, story, and calendar areas: categories, learning
// paths, and collections (UI structure), plus occasion date rules. No duas, Salah guides,
// or stories ship here — they are published from the CMS only after scholarly review.
// Occasion learning content is a draft until it is written, sourced, and reviewed.

export const rawDuaCategories: unknown[] = [
  { slug: 'morning-evening', title: 'Morning and evening adhkar', description: 'Remembrance for the start and end of the day.', order: 1 },
  { slug: 'waking-sleeping', title: 'Waking and sleeping', description: 'Before sleep and on waking.', order: 2 },
  { slug: 'eating-drinking', title: 'Eating and drinking', description: 'Before and after meals.', order: 3 },
  { slug: 'home', title: 'Leaving and entering the home', description: 'Going out and coming back.', order: 4 },
  { slug: 'travel', title: 'Travel', description: 'Setting out, on the journey, and returning.', order: 5 },
  { slug: 'mosque', title: 'Entering and leaving the mosque', description: 'At the mosque door.', order: 6 },
  { slug: 'salah', title: 'Salah-related supplications', description: 'Within and after prayer.', order: 7 },
  { slug: 'distress', title: 'Distress and hardship', description: 'In difficulty, worry, and grief.', order: 8 },
  { slug: 'gratitude', title: 'Gratitude and praise', description: 'Thanks and praise.', order: 9 },
  { slug: 'forgiveness', title: 'Seeking forgiveness', description: 'Asking for forgiveness.', order: 10 },
  { slug: 'family', title: 'Family and parents', description: 'For parents, children, and family.', order: 11 },
  { slug: 'everyday', title: 'Everyday situations', description: 'Moments throughout the day.', order: 12 },
];

export const rawDuas: unknown[] = [];

export const rawSalahPaths: unknown[] = [
  { slug: 'preparing', title: 'Preparing for Salah', summary: 'Getting ready to pray.', order: 1 },
  { slug: 'wudu', title: 'Wudu', summary: 'Ablution, step by step.', order: 2 },
  { slug: 'conditions', title: 'Conditions and essentials of prayer', summary: 'What a valid prayer requires.', order: 3 },
  { slug: 'step-by-step', title: 'Step-by-step Salah', summary: 'The movements and words of prayer, in order.', order: 4 },
  { slug: 'five-daily', title: 'The five daily prayers', summary: 'Fajr, Dhuhr, Asr, Maghrib, and Isha.', order: 5 },
  { slug: 'understanding-words', title: 'Understanding the words of Salah', summary: 'What the recitations mean.', order: 6 },
  { slug: 'recitations', title: 'Common recitations and supplications', summary: 'Learn and revise the recitations.', order: 7 },
  { slug: 'sunnah-voluntary', title: 'Sunnah and voluntary prayers', summary: 'Witr, Tahajjud, Duha, and more.', order: 8 },
  { slug: 'revision', title: 'Learning and revision', summary: 'Practise what you have learned.', order: 9 },
];

export const rawSalahGuides: unknown[] = [];

export const rawStoryCollections: unknown[] = [
  { slug: 'prophets', title: 'Stories of the Prophets', summary: 'The Prophets mentioned in the Quran.', order: 1, kind: 'prophets' },
  { slug: 'seerah', title: 'Seerah of Prophet Muhammad ﷺ', summary: 'The life of the Prophet ﷺ.', order: 2, kind: 'prophets' },
  { slug: 'early-community', title: 'The early Muslim community', summary: 'The Companions and the first generations.', order: 3, kind: 'history' },
  { slug: 'rightly-guided-caliphs', title: 'The Rightly Guided Caliphs', summary: 'The four caliphs who followed the Prophet ﷺ.', order: 4, kind: 'history' },
  { slug: 'civilizations', title: 'Islamic civilizations and history', summary: 'Societies, cities, and eras.', order: 5, kind: 'history' },
  { slug: 'scholars', title: 'Muslim scholars and contributions', summary: 'Scholars and their work.', order: 6, kind: 'history' },
];

export const rawStories: unknown[] = [];

const draftOccasion = (slug: string, title: string, rule: unknown, ruleNote?: string) => ({
  id: `occasion-${slug}`,
  slug,
  title,
  summary: '',
  language: 'en',
  status: 'draft',
  contentClass: 'religious',
  sources: [],
  review: { reviewer: null, reviewedOn: null, version: 1 },
  editorialNotes: 'Write the learning content with sources, and have a reviewer confirm the date rule before publishing.',
  rule,
  ...(ruleNote ? { ruleNote } : {}),
  sections: [],
  relatedDuaSlugs: [],
  relatedLessonIds: [],
});

export const rawOccasions: unknown[] = [
  draftOccasion('ashura', 'Ashura', { kind: 'day', month: 1, day: 10 }),
  draftOccasion('ramadan', 'Ramadan', { kind: 'month', month: 9 }),
  draftOccasion('laylat-al-qadr', 'Laylat al-Qadr', { kind: 'last-nights', month: 9, nights: 10 }, 'Shown as the last ten nights of Ramadan. This app does not assign a specific night.'),
  draftOccasion('eid-al-fitr', 'Eid al-Fitr', { kind: 'day', month: 10, day: 1 }),
  draftOccasion('first-ten-days-dhul-hijjah', 'First ten days of Dhu al-Hijjah', { kind: 'range', month: 12, fromDay: 1, toDay: 10 }),
  draftOccasion('day-of-arafah', 'Day of Arafah', { kind: 'day', month: 12, day: 9 }),
  draftOccasion('hajj', 'Hajj', { kind: 'range', month: 12, fromDay: 8, toDay: 13 }, 'Shown as 8–13 Dhu al-Hijjah; the days observed can vary.'),
  draftOccasion('eid-al-adha', 'Eid al-Adha', { kind: 'day', month: 12, day: 10 }),
];

/** Learning areas for foundational knowledge. Courses appear under them once reviewed. */
export const knowledgeAreas = [
  { category: 'foundations', title: 'Aqeedah — foundational beliefs' },
  { category: 'pillars-of-islam', title: 'The Five Pillars of Islam' },
  { category: 'pillars-of-iman', title: 'The pillars of Iman' },
  { category: 'hadith', title: 'Hadith and explanations' },
  { category: 'character', title: 'Islamic manners and character' },
  { category: 'fiqh', title: 'Fiqh and everyday questions' },
  { category: 'vocabulary', title: 'Islamic vocabulary' },
  { category: 'scholars', title: 'Lives and contributions of scholars' },
] as const;
