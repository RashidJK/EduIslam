-- Development seed: draft placeholders for the content backlog (see docs/CONTENT_REVIEW.md).
-- Each row is a DRAFT with a title and editorial notes only — no religious text. Nothing here
-- is visible to learners until it is written, sourced, reviewed, and published in the CMS.
insert into public.content_items (content_type, slug, title, content_class, payload) values
  ('course', 'five-pillars', 'The Five Pillars of Islam', 'religious',
    '{"editorialNotes": "Needs a qualified author. Cite Quran and hadith sources for each pillar; note differences between schools where relevant.", "category": "pillars-of-islam", "area": "knowledge", "level": "beginner", "objectives": [], "estimatedMinutes": 0, "prerequisites": [], "modules": [], "sources": [], "summary": ""}'),
  ('course', 'pillars-of-iman', 'The Pillars of Iman', 'religious',
    '{"editorialNotes": "Needs a qualified author and reviewer.", "category": "pillars-of-iman", "area": "knowledge", "level": "beginner", "objectives": [], "estimatedMinutes": 0, "prerequisites": [], "modules": [], "sources": [], "summary": ""}'),
  ('course', 'words-of-salah', 'Understanding the words of Salah', 'religious',
    '{"editorialNotes": "Recitations must cite their sources; Quranic recitations should reference verses rather than retype text. State the school followed.", "category": "salah", "area": "salah", "level": "beginner", "objectives": [], "estimatedMinutes": 0, "prerequisites": [], "modules": [], "sources": [], "summary": ""}'),
  ('salah_guide', 'wudu-step-by-step', 'Wudu, step by step', 'religious',
    '{"editorialNotes": "Write each step with its source. Note where schools differ. Illustrations must not depict faces.", "pathSlug": "wudu", "practiceType": "general", "estimatedMinutes": 5, "steps": [], "sources": [], "summary": ""}'),
  ('story', 'prophet-yusuf', 'The story of Prophet Yusuf', 'religious',
    '{"editorialNotes": "Label every passage (Quran / hadith / historical / commentary). Reference Surah Yusuf by verse. No invented dialogue.", "collectionSlug": "prophets", "chapters": [], "sources": [], "summary": ""}')
on conflict do nothing;
