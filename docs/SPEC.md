# Islamic Learning Companion — Product & Engineering Specification

> **Purpose:** This document is the source of truth for Claude Code when planning, implementing, testing, and improving the application. Build a polished, mobile-first Islamic learning platform inspired by the *learning mechanics* of Duolingo, without copying its branding, characters, or proprietary UI.
>
> **Working product name:** Islamic Learning Companion. Keep the product name, logo, and brand tokens easy to change.
>
> **Core promise:** Help Muslims learn and practise Islam consistently through short lessons, Quran reading and listening, memorization and revision, duas, Salah education, stories of the Prophets, Islamic history, and the Hijri calendar.
>
> **Important:** Do not try to build every feature in one enormous pass. First inspect the repository, identify existing conventions, propose a phased implementation plan, and then build a coherent, working MVP. Do not replace functioning project architecture without a clear reason.

---

## 1. Product vision

Build one connected learning experience—not a collection of unrelated Islamic pages. The app should help a learner answer:

- What can I read or learn today?
- Where did I stop in the Quran?
- Which verse or passage should I revise?
- Which dua is relevant to an occasion, and how do I learn it?
- How do I perform Salah, and what do its recitations mean?
- What can I learn about a Prophet, Islamic history, or a foundational Islamic topic?
- Which Hijri month are we in, and what occasions are coming up?
- What have I learned, and what should I revisit?

### Product principles

1. **Religious accuracy before engagement.** Never fabricate Quranic text, hadith, citations, duas, historical claims, or religious rulings.
2. **Learning over gamification.** Streaks, points, reminders, and achievements support learning; they must not imply a person's faith or spiritual standing can be scored.
3. **Respectful and calm design.** No cartoonish religious caricatures, manipulative urgency, guilt-based notifications, or distracting gamification during Quran reading.
4. **Beginner-friendly, useful for returning learners.** Users select their interests and starting level; don't force everyone through the same curriculum.
5. **Accessible and mobile-first.** Responsive layouts, keyboard access, readable type, screen-reader labels, reduced-motion support, and strong Arabic RTL handling.
6. **Transparent sources.** Educational religious content should include references and review status.
7. **Privacy by default.** Keep personal learning data private. Do not expose profiles or reading/memorization activity publicly by default.
8. **Content-driven architecture.** Lessons, duas, courses, stories, and calendar items must be manageable as structured content rather than hard-coded throughout UI components.

---

## 2. Target users and onboarding

Support a broad audience: beginners learning foundational Islam, Quran readers, people memorizing Quran, and Muslims who want a consistent daily learning routine.

### First-run onboarding

Ask users to select one or more goals:
- Learn to read Arabic / Quran
- Read the Quran regularly
- Memorize and revise Quran
- Understand Quran vocabulary and meaning
- Learn duas for daily occasions
- Learn how to perform Salah and understand its recitations
- Study stories of the Prophets
- Learn Islamic history
- Learn foundational Islamic knowledge
- Follow the Hijri calendar and important occasions
- Build a consistent daily learning habit

Ask optional experience questions:
- Quran reading: beginner / can read Arabic / confident reader
- Memorization: not started / memorizing / revising what I know
- Preferred daily learning time: 5 / 10 / 15 / 20 minutes
- Reminder preference and local time
- Preferred translation/content language (initially English; structure for future languages)

Allow skipping onboarding, editing answers later, and changing goals at any time. Never make religious identity assumptions beyond the user's explicit selections.

After onboarding, create a suggested daily plan from the selected goals. Make clear that it is a suggestion and can be customized.

---

## 3. Main information architecture

### Primary navigation

Desktop:
- Home
- Learn
- Quran
- Duas
- Salah
- Stories
- Calendar

Secondary navigation / menu:
- Islamic Knowledge
- Listening
- Progress
- Settings
- Help / Sources & methodology

Mobile: compact bottom navigation for the most-used destinations, with the remaining sections in a clearly labeled menu. Ensure every destination remains reachable.

### Required routes / screens

Implement routes appropriate to the chosen framework. Suggested paths:

- `/` — public landing page
- `/onboarding` — learning goals and preferences
- `/app` — daily learning dashboard
- `/learn` — learning paths and courses
- `/learn/:courseSlug` — course overview
- `/lesson/:lessonId` — interactive lesson player
- `/quran` — Quran index
- `/quran/:surahNumber` — Surah reader
- `/quran/bookmarks` — bookmarks and recent reading
- `/memorization` — memorization dashboard
- `/memorization/:itemId` — memorization session
- `/listening` — recitation library
- `/duas` — searchable, categorized dua library
- `/duas/:slug` — dua details and practice
- `/salah` — Salah learning hub
- `/salah/:slug` — step-by-step guide
- `/stories` — Prophets' stories and Islamic history
- `/stories/:slug` — story / chapter
- `/calendar` — Hijri calendar and occasions
- `/calendar/:slug` — occasion learning page
- `/knowledge` — foundational Islamic knowledge
- `/progress` — learning statistics and revision queue
- `/settings` — profile, goals, language, reminders, accessibility, privacy
- `/admin` — restricted content-management interface

Protect private routes and admin access appropriately. Avoid fake authentication or client-only role checks as the sole security mechanism.

---

## 4. Daily learning dashboard

The dashboard is the product's central experience.

### Dashboard sections

1. **Greeting and today's plan**
   - A configurable daily goal (5, 10, 15, or 20 minutes).
   - Estimated duration.
   - Progress toward the chosen goal.
   - “Continue” / “Start session” action.

2. **Continue learning**
   - Resume the last incomplete lesson, Quran position, story chapter, or memorization session.
   - Show a useful next action, not an arbitrary list.

3. **Today's suggested activities**
   - Quran reading
   - Memorization revision
   - Dua practice
   - Salah lesson
   - Short story / Islamic knowledge lesson
   - Optional reflection or sourced hadith
   - Do not require users to complete all activities.

4. **Revision due**
   - Items due for spaced repetition, with a clear reason and estimated time.

5. **Quran progress**
   - Reading position, bookmarked passages, memorization status.
   - Keep reading progress and memorization progress distinct.

6. **Explore**
   - Courses, duas by occasion, Salah, stories, calendar, listening.

7. **Islamic calendar preview**
   - Current Hijri date if a reliable date service/configuration is available.
   - Upcoming occasions with uncertainty and local moon-sighting caveats.

8. **Gentle consistency indicator**
   - Optional streak or weekly activity.
   - Never shame users for missed days or suggest a streak reflects religious worth.

### Daily plan behavior

Build a simple rule-based recommendation engine first:
- Include activities matching selected goals.
- Prioritize overdue review items.
- Resume unfinished activities.
- Avoid repeating the same new lesson too often.
- Respect the chosen time budget.
- Let users swap, remove, reorder, or skip items.
- Persist completed activity and learning progress.

Do not require an LLM for basic daily plan generation.

---

## 5. Quran reader

### Required capabilities

- Browse all 114 Surahs and navigate by Surah.
- Display Quranic Arabic with proper RTL, diacritics, line spacing, and a suitable font.
- Display verse numbers and allow selecting/copying verse text where appropriate.
- Offer an optional translation panel (English initially).
- Play verse or Surah audio from a configured, licensed source.
- Highlight the currently playing verse if the audio provider supports verse timing.
- Play / pause, seek, previous/next verse where supported, and repeat a verse or range.
- Bookmark verses and save a reading position.
- Resume reading from the last location.
- Adjust Arabic font size and translation display.
- Offer a distraction-free reading mode.
- Search Surah names and, where a suitable data source exists, text/translation.
- Show clear loading, empty, offline, and provider-error states.

### Quran content integrity

- Do not hand-type or generate Quran text with an LLM.
- Use a vetted Quran data source and validate its license, provenance, text edition, diacritics, verse numbering, and update policy.
- Store source/provider and edition metadata.
- Do not silently alter Quran text or normalize away meaningful diacritics.
- Clearly distinguish the original Arabic text from translations and explanatory commentary.
- Do not invent audio URLs or imply audio files are licensed when that is unknown.
- Provide a graceful “audio unavailable” state.
- Add automated checks for verse counts and content integrity where possible.

---

## 6. Quran listening library

### Features

- Browse by Surah and reciter.
- Play full Surahs or individual verses when supported.
- Repeat a verse, a range, or a Surah.
- Save favorites and listening history.
- Resume playback.
- Optional playback speed control if the provider permits it.
- Follow Arabic text while listening where timing data is available.
- Optional repeat-after-reciter practice.
- Responsive audio player with accessible controls.
- Clearly display reciter and source metadata.

### Licensing and implementation

Use only audio that is appropriately licensed or explicitly permitted by the provider. Keep provider integration behind a service/adapter so the source can be changed. Do not scrape services or bundle copyrighted audio without permission. Offline downloads are a later feature and must honor licensing.

---

## 7. Quran memorization and revision

This is a core differentiator. Keep memorization separate from general reading progress.

### Memorization workflow

A session can guide the learner through:
1. Choose a Surah, verse range, or saved passage.
2. Listen to a reviewed recitation.
3. Read the verse while listening.
4. Repeat the passage.
5. Hide the text and attempt recall.
6. Reveal the text and self-assess.
7. Recite connected verses together.
8. Save the session and schedule review.

### Memorization statuses

Use clear learner-facing statuses such as:
- Not started
- Learning
- Recently memorized
- In revision
- Consistently recalled

Do not automatically mark a passage as mastered because the user clicked “complete.” Let the learner record self-assessment and review history.

### Spaced repetition

Implement a simple, transparent scheduling system initially. Persist:
- passage identifier / verse range
- current status
- date started
- last practiced date
- next review date
- self-assessed recall quality
- practice history
- optional notes

A review rating can be: “Again”, “Difficult”, “Good”, “Easy”. Use those responses to adjust review intervals. Keep the algorithm modular so it can be improved later.

### Future integrations

Optional recitation recording and AI pronunciation feedback are later-phase features. Do not claim automated recitation checking is authoritative. Any pronunciation/Tajweed scoring needs a specialized, validated model and qualified human review. Obtain clear consent before recording audio, explain retention/deletion, and avoid uploading audio without user permission.

---

## 8. Dua library

### Browse and search

Provide search and categories such as:
- Morning and evening adhkar
- Waking and sleeping
- Eating and drinking
- Leaving and entering the home
- Travel
- Entering and leaving the mosque
- Salah-related supplications
- Distress and hardship
- Gratitude and praise
- Seeking forgiveness
- Family and parents
- Everyday situations

Categories must be editable by admins. Do not claim a category is exhaustive.

### Dua detail page

Each dua may contain:
- Arabic text
- Transliteration (optional)
- Translation / meaning
- Audio pronunciation or recitation, if licensed
- When it is used
- Source citation (book/collection, chapter or reference where available)
- Authenticity / grading with attribution where relevant
- Reviewer status
- “Practice this dua” action
- Bookmark / favorite
- Add to daily plan
- Memorization progress

### Dua lesson interactions

Support:
- Listen and follow along
- Reveal/hide transliteration
- Match Arabic phrase to meaning
- Fill a missing word only if the content data supports it reliably
- Recall practice
- Self-assessment and spaced repetition

### Accuracy safeguards

Do not invent or paraphrase a dua while presenting it as a verbatim narration. Do not invent hadith grading or references. Separate exact source text from explanatory notes. Content should not be published until its source and review status meet the configured publishing requirements.

---

## 9. Salah learning hub

### Main learning paths

1. Preparing for Salah
2. Wudu
3. Conditions and essentials of prayer
4. Step-by-step Salah
5. The five daily prayers
6. Understanding the words recited in Salah
7. Common recitations and supplications
8. Sunnah and voluntary prayers
9. Learning/revision mode

### Step-by-step Salah guide

Each step can contain:
- Step name
- Short explanation
- Illustration or reviewed visual (optional)
- Arabic recitation if applicable
- Transliteration
- Translation / meaning
- Audio
- Next / previous navigation
- A “why this matters” explanation when appropriate

### Prayers to cover over time

- Fajr
- Dhuhr
- Asr
- Maghrib
- Isha
- Witr
- Tahajjud
- Duha
- Janazah
- Eid prayer
- Tarawih

Clearly distinguish obligatory, Sunnah, and voluntary practices. Salah procedures and rulings can differ by recognized school of jurisprudence; provide attribution and explanations instead of pretending there are no differences. Do not state disputed rulings as universally agreed.

### Learning words of Salah

Build lessons around recitations such as:
- Takbir
- Al-Fatiha
- Common phrases during Ruku and Sujud
- Tashahhud
- Salawat upon the Prophet ﷺ
- Relevant supplications

Display Arabic, a readable transliteration when useful, translation, audio, and source/reference. Ensure the user can practise each item and later review it.

---

## 10. Stories of the Prophets and Islamic history

### Stories hub

Organize content into:
- Stories of the Prophets
- Seerah of Prophet Muhammad ﷺ
- Early Muslim community
- Rightly Guided Caliphs
- Islamic civilizations and history
- Muslim scholars and contributions

### Story / chapter experience

Each story can contain:
- Title and short introduction
- Chapter progression
- Readable text
- Optional narrated audio
- Timeline or map only when accurate and useful
- Relevant Quran references
- References to reliable historical sources
- Key lessons / reflection
- Short knowledge check
- Mark as read / resume later

### Initial stories

Potential initial story collections include Adam, Nuh, Ibrahim, Yusuf, Musa, Dawud, Sulayman, Yunus, Isa, and Muhammad ﷺ. The exact content set should be chosen and reviewed by qualified content reviewers.

### Historical accuracy

- Clearly distinguish Quranic statements, authentic hadith, and later historical accounts.
- Do not invent dialogue, scenes, dates, or events and present them as established facts.
- Where accounts differ, note that responsibly.
- Use respectful visual conventions for prophets; avoid depicting prophets directly.
- Do not publish AI-generated religious history without human review.
- Store sources and reviewer information with every lesson.

---

## 11. Hijri calendar and Islamic occasions

### Calendar screen

Display:
- Current Hijri date
- Gregorian equivalent
- Current Hijri month
- Twelve Hijri months in order
- Upcoming occasions
- Month detail pages
- Educational content for each occasion
- Optional user-configured reminders

### Months

Include:
1. Muharram
2. Safar
3. Rabi al-Awwal
4. Rabi al-Thani
5. Jumada al-Ula
6. Jumada al-Akhirah
7. Rajab
8. Sha'ban
9. Ramadan
10. Shawwal
11. Dhu al-Qi'dah
12. Dhu al-Hijjah

### Occasions and learning journeys

Potential topics:
- Sacred months
- Ashura
- Ramadan and fasting
- Laylat al-Qadr
- Eid al-Fitr
- First ten days of Dhu al-Hijjah
- Day of Arafah
- Hajj
- Eid al-Adha

Each occasion page can explain its meaning, relevant historical context, established acts of worship, relevant duas, and related lessons.

### Date accuracy

Hijri dates can differ by moon-sighting practice, location, and calculation method. Make the selected method/provider explicit. Support configurable local conventions. Do not present future dates as definitively confirmed when local moon sighting is required. Use a reputable date provider or a tested library; don't hard-code the current Hijri date.

---

## 12. Islamic knowledge courses

Build a course system that can grow beyond the initial MVP.

Possible course categories:
- Aqeedah / foundational beliefs
- The Five Pillars of Islam
- The pillars of Iman
- Hadith and explanations
- Islamic manners and character
- Fiqh and everyday questions
- Halal and haram
- Islamic vocabulary
- Lives and contributions of Muslim scholars

Every course should have:
- Title, summary, category, level, language
- Learning objectives
- Ordered modules and lessons
- Estimated duration
- Prerequisites where appropriate
- Source references
- Reviewer and review status
- Published/unpublished status
- Lesson progress and revision settings

For contested issues, show the relevant school, source, or scholarly difference. Do not allow an unrestricted chatbot to act as the authority for religious rulings.

---

## 13. Lesson player and learning interactions

Create a reusable lesson engine rather than bespoke screens for every course.

### Initial question types

- Single-choice multiple choice
- Multiple selection (only where suitable)
- Match pairs
- Put steps in order
- Match Arabic word / phrase to meaning
- Listen and select (only when audio is available)
- Fill a blank when the correct source-backed answer is defined
- Reflection prompt (not scored)
- Read/listen and mark complete
- Recall practice with reveal/hide

### Lesson flow

1. Intro and learning objective
2. One small concept or example
3. Practice activity
4. Immediate, respectful feedback
5. Short summary
6. Completion and progress update
7. Optional next lesson or revision

Avoid punishing learners for mistakes. Explain the reason for the answer. Make content navigable by keyboard and screen reader. Store question content separately from rendering components.

Do not use generated content as an authoritative religious answer unless it has been reviewed and approved.

---

## 14. Progress, goals, and habit support

### Progress page

Track distinct dimensions:
- Lessons completed
- Learning time (approximate and clearly described)
- Quran reading progress
- Memorization items by status
- Revision items due
- Duas learned / in revision
- Salah lessons completed
- Stories and courses completed
- Weekly activity

Use clear labels. Do not turn the progress screen into a ranking of religious worth.

### Goals

Allow users to set:
- Daily learning minutes
- Weekly lesson target
- Quran reading goal (user-defined)
- Memorization goal
- Selected learning paths
- Reminder schedule

### Streaks and achievements

Optional and respectful:
- First lesson
- First week of learning
- Completed a course
- Completed a revision session
- Reading milestone
- Memorization milestone

No shame-based language or aggressive push notifications. Make reminders easy to disable.

---

## 15. Search and discovery

Provide a global search that can find:
- Courses and lessons
- Duas and occasions
- Surahs and verses where supported
- Stories and chapters
- Salah guides
- Calendar pages
- Islamic knowledge topics

Use categories, filters, and useful empty states. Search results should show the content type and source/review status where relevant. Do not return unpublished or draft admin content to ordinary users.

---

## 16. AI features — optional, carefully constrained

Do not make AI a dependency for core functionality. The MVP should work without it.

Potential later features:
- Explain a Quranic vocabulary item using approved sources
- Simplify a reviewed lesson for a beginner
- Generate additional practice questions from reviewed course content
- Recommend revision from learning history
- Help users find relevant content
- Translate UI or approved educational explanations, subject to review

### AI safeguards

- Use retrieval from an approved, versioned knowledge base.
- Cite sources for factual religious explanations.
- Clearly label generated explanations.
- Never generate Quran text, hadith text, source citations, or authenticity gradings from memory.
- If the evidence is insufficient, say so and direct the user to a qualified scholar or trusted source.
- Do not make definitive rulings on contested or personal cases.
- Do not train on user recordings or sensitive learning data without explicit, informed permission.
- Store API keys server-side; never ship secrets to the browser.
- Add rate limits, usage limits, and logging that avoids unnecessary personal data.

---

## 17. Admin content-management system

A robust admin CMS is essential because the product depends on trustworthy content.

### Roles

At minimum:
- **Admin:** manage users, settings, roles, and all content.
- **Editor:** create and edit drafts.
- **Reviewer:** review religious accuracy, references, and presentation.
- **Publisher:** publish approved content (may be combined with Admin initially).

Use server-enforced role checks. Do not rely on hiding buttons in the frontend.

### Content workflow

`Draft → In review → Changes requested / Approved → Published → Archived`

Every published item should retain:
- Author/editor
- Reviewer
- Reviewer notes
- Sources and citations
- Review date
- Version history
- Language
- Content type
- Publication status

### CMS content types

- Courses
- Modules
- Lessons
- Questions and answers
- Quran provider metadata (not user-generated Quran text)
- Dua records
- Salah guides and steps
- Stories and chapters
- Calendar occasions
- Audio provider metadata
- Translations / localized content
- Source records

### Admin functions

- Create/edit content
- Preview exactly as the learner sees it
- Submit for review
- Approve/request changes
- Publish/unpublish/archive
- Manage source references
- View content completeness
- Search/filter content
- Review version history
- Manage user roles
- View basic product health metrics without exposing unnecessary personal data

Seed initial content only when source-backed and reviewed. If verified content is not available, create clearly marked draft placeholders in admin—not fabricated live lessons.

---

## 18. Suggested technical architecture

First inspect the repository and follow its established stack where reasonable. If starting from an empty repository, a practical default is:

- **Frontend:** React + TypeScript + Vite
- **Routing:** React Router
- **Styling:** Tailwind CSS, with reusable accessible components
- **Backend / database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage for permitted user/content assets
- **Validation:** Zod or equivalent shared validation
- **Testing:** Vitest + React Testing Library; Playwright for key end-to-end journeys
- **Hosting:** choose a deployment target appropriate to the repository
- **Audio and Quran data:** provider adapters with explicit configuration and licensing checks

Do not blindly add every suggested library. Inspect what is already installed, prefer stable and maintainable choices, and explain meaningful tradeoffs.

### Architecture requirements

- Separate UI, domain logic, data access, and external providers.
- Use typed interfaces for content and services.
- Keep API secrets server-side.
- Validate all user inputs.
- Provide loading, error, and empty states.
- Avoid giant monolithic components.
- Avoid duplicating learning logic across modules.
- Include migrations/schema definitions and setup instructions.
- Include `.env.example` with placeholders only.
- Never commit real secrets or personal data.
- Use server-side authorization and database row-level security where appropriate.
- Add graceful fallbacks when third-party services are unavailable.
- Avoid coupling the application to a single Quran/audio provider.

### Proposed data model

Adapt this model to the existing stack rather than implementing it mechanically.

**Identity and preferences**
- `profiles`: user ID, display name, language, timezone, onboarding completion, created/updated timestamps.
- `user_goals`: user ID, goal type, target, enabled.
- `user_preferences`: reminder settings, daily target, accessibility preferences, Hijri date convention.

**Learning content**
- `courses`: ID, slug, title, description, category, level, language, status, estimated duration.
- `modules`: ID, course ID, title, order index.
- `lessons`: ID, module/course ID, slug, title, type, objectives, content payload, estimated duration, status, version.
- `lesson_questions`: ID, lesson ID, type, prompt, options/payload, answer key, explanation, source references.
- `content_sources`: ID, source type, title, author/collection, locator, URL if appropriate, notes.
- `content_reviews`: content ID/version, reviewer ID, status, notes, reviewed timestamp.
- `translations`: content ID, language, translated fields, review status.

**Quran**
- `quran_editions`: provider, edition, language, provenance, license, version.
- `surahs`: canonical Surah number and metadata sourced from verified data.
- `verses`: canonical identifiers and provider reference; avoid duplicating unverified text.
- `reciters`: provider identifiers and metadata.
- `audio_assets`: provider, reciter, Surah/verse reference, license/provenance, availability.
- `reading_progress`: user ID, Surah/verse position, last-read timestamp.
- `bookmarks`: user ID, content type, content identifier, created timestamp.

**Memorization and revision**
- `memorization_items`: user ID, passage identifier/range, status, created timestamp.
- `memorization_reviews`: item ID, user ID, review date, recall rating, notes.
- `revision_schedule`: user ID, item type/ID, next review date, interval, scheduling metadata.

**Duas**
- `duas`: ID, slug, Arabic text sourced from verified records, transliteration, translation, usage notes, source reference, authenticity attribution, review status.
- `dua_categories`: ID, slug, title, order.
- `dua_category_links`: dua ID, category ID.
- `user_dua_progress`: user ID, dua ID, status, last practiced, next review.
- `user_favorites`: user ID, item type, item ID.

**Salah, stories, and calendar**
- `salah_guides`: ID, slug, title, school/context where relevant, status.
- `salah_steps`: guide ID, order, title, content, recitation/source references.
- `stories`: ID, slug, title, category, summary, status.
- `story_chapters`: story ID, order, content, sources, status.
- `calendar_occasions`: ID, slug, title, description, date rule, sources, review status.
- `calendar_settings`: selected date provider/method and locale convention.

**User activity**
- `lesson_progress`: user ID, lesson ID, status, score if applicable, started/completed/updated timestamps.
- `daily_activity`: user ID, local date, minutes estimate, activities completed.
- `daily_plan_items`: user ID, local date, item type/ID, order, status.
- `reminders`: user ID, type, schedule, enabled.
- `admin_audit_log`: actor, action, entity, timestamp, relevant metadata without secrets.

Add indexes and foreign keys. Use a consistent ID strategy. Enforce uniqueness where appropriate. Use RLS or equivalent authorization policies so one user cannot read or modify another user's private learning records.

---

## 19. UI / visual design system

### Direction

Modern, calm, premium, warm, readable, respectful, and focused. Do not copy Duolingo's proprietary design or character system.

### Suggested starting palette

Define these as CSS variables/design tokens so they are easy to change:
- Background: warm ivory / off-white
- Surface: white or slightly tinted ivory
- Primary: deep forest green
- Secondary: muted sage
- Accent: restrained gold
- Text: dark charcoal
- Muted text: neutral grey
- Borders: subtle warm grey
- Error/success/warning: accessible semantic tokens

Avoid excessive gold, ornate patterns everywhere, gradients that reduce legibility, and visual clutter. Use Islamic geometric motifs sparingly in decorative contexts, not behind dense Arabic text.

### Typography

- A legible Arabic font with strong Quranic glyph/diacritic support.
- A clean sans-serif for English UI.
- Correct RTL handling at component and page level.
- Avoid clipping diacritics by ensuring adequate line height and font fallback.
- Keep Quranic text visually distinct from translations and commentary.

### Interaction

- Subtle animations only; respect `prefers-reduced-motion`.
- Clear hover, focus, pressed, disabled, loading, success, and error states.
- Large touch targets.
- No autoplay audio without user action.
- Audio controls should remain usable on small screens.
- Confirm destructive actions.
- Do not use color alone to convey correctness or status.

---

## 20. Accessibility, localization, and performance

- Target WCAG 2.2 AA where feasible.
- Full keyboard navigation.
- Visible focus states.
- Semantic headings and landmarks.
- Accessible labels for audio controls and interactive exercises.
- Sufficient contrast.
- Screen-reader-friendly feedback.
- Reduced-motion option.
- Responsive from small mobile screens upwards.
- Proper `lang` and `dir` attributes for Arabic and English.
- Design data structures for future Swahili and other languages.
- Do not machine-translate religious content and publish it without review.
- Lazy-load noncritical content and audio.
- Cache appropriate static data.
- Avoid loading all Quran audio or all course content at once.
- Provide clear offline/error states.
- Keep core reading and learning screens fast on slower mobile connections.

---

## 21. Security and privacy

- Protect private routes.
- Enforce authorization on the server/database, not only in UI.
- Apply RLS or equivalent database-level restrictions to personal progress and profile data.
- Validate and sanitize input.
- Rate-limit sensitive endpoints.
- Keep secrets out of frontend bundles and source control.
- Use secure authentication/session practices.
- Allow users to export or delete their account data where applicable.
- Explain how recordings are processed before offering audio recording features.
- Do not make user progress public by default.
- Minimize analytics collection and avoid logging sensitive content unnecessarily.
- Include an appropriate privacy notice and terms before public launch.

---

## 22. Testing and quality gates

Add tests for critical behavior rather than only testing visual rendering.

### Unit / integration tests
- Onboarding goal selection and persistence
- Daily plan generation under different time budgets
- Lesson answer evaluation and feedback
- Lesson completion and progress updates
- Quran bookmark / resume behavior
- Memorization review scheduling
- Dua search and category filtering
- Calendar date-provider fallback and uncertainty labels
- Admin publishing workflow
- Authorization and ownership checks
- Arabic RTL rendering and text controls where testable

### End-to-end journeys
1. A new learner completes onboarding and opens the daily plan.
2. A learner reads a Quran passage, bookmarks it, leaves, and resumes later.
3. A learner completes a dua practice session and sees it scheduled for revision.
4. A learner starts a memorization item and reviews it later.
5. A learner follows a Salah guide from beginning to end.
6. A learner reads a story chapter and resumes the next chapter.
7. An admin drafts content, submits it for review, approves it, and publishes it.
8. A normal user cannot access admin screens or another user's data.

### Definition of done

A feature is not complete merely because the screen exists. It must:
- Work through its main user journey.
- Use persisted data where required.
- Handle loading, error, and empty states.
- Be responsive and accessible.
- Have appropriate tests.
- Have no fabricated religious content.
- Include source/review metadata when religious claims are involved.
- Be documented and configured safely.

---

## 23. Implementation roadmap

### Phase 0 — Repository inspection and plan
1. Inspect all project files, scripts, dependencies, routes, styles, and existing functionality.
2. Identify what is already implemented and what is missing.
3. Do not overwrite or discard existing work.
4. Present a concise architecture summary, key risks, proposed milestones, and questions only when truly blocking.
5. Create/update `README.md`, implementation checklist, and `.env.example` as needed.
6. Confirm the application can be run and tested.

### Phase 1 — Foundation and polished shell
- Establish the design tokens, layout, responsive navigation, routes, and reusable UI components.
- Add authentication and onboarding if backend configuration is available.
- Build the daily dashboard with honest empty states and seeded demo data only when clearly labeled.
- Add a content model and admin CMS skeleton.
- Set up testing, linting, and type checks.

### Phase 2 — Reusable lesson engine
- Implement lesson content schema and player.
- Support initial question types.
- Persist progress.
- Add learning paths, courses, and the progress page.
- Ensure feedback is explanatory and respectful.

### Phase 3 — Quran reader and listening
- Integrate a verified Quran data provider.
- Implement reader, translation display, bookmarks, resume, and audio player.
- Add provider metadata and graceful error states.
- Verify text integrity and licensing.

### Phase 4 — Memorization and revision
- Add memorization items, recall practice, self-assessment, and spaced repetition.
- Connect due reviews to the daily plan.

### Phase 5 — Duas and Salah
- Add searchable dua library, detail pages, audio, source/review metadata, and practice mode.
- Add Salah guides and lessons with source-backed content.

### Phase 6 — Stories, Islamic knowledge, and calendar
- Add story chapters and courses.
- Add Hijri calendar provider, month pages, and occasions.
- Make date method and local uncertainty visible.

### Phase 7 — Content review and launch hardening
- Review the accuracy, citations, licenses, and quality of all live content.
- Complete security/privacy review.
- Run tests, accessibility checks, performance checks, and production build.
- Document setup, deployment, backup, content review, and incident processes.

Work incrementally. At the end of each phase, run relevant checks and report exactly what passed, what failed, and what remains.

---

## 24. Seed data policy

It is acceptable to seed:
- UI categories
- Empty learning paths
- Clearly marked sample lessons that are not presented as verified religious teaching
- Sample users or records in a local development environment only

Do **not** seed invented Arabic Quran text, invented duas, fabricated hadith, made-up source references, or AI-generated stories presented as factual Islamic teaching.

If source-verified content is unavailable:
- Create a draft content record.
- Mark it `draft` / `needs_review`.
- Add a note describing what must be verified.
- Do not publish it to ordinary learners.

Any demo account must be clearly identified and must not contain real user information.

---

## 25. What Claude Code should do first

Start by inspecting the repository and responding with:
1. A summary of the current app and stack.
2. Existing features that should be preserved.
3. A gap analysis against this specification.
4. A phased implementation plan ordered by dependencies.
5. Any genuine blockers (for example, missing environment variables or a required Quran/audio provider decision).

Then proceed with the first small, coherent implementation phase. Do not stop after writing a plan unless the user explicitly asks for planning only. Make sensible, reversible decisions for non-blocking details.

Before changing files:
- Inspect existing conventions.
- Keep changes scoped and testable.
- Avoid replacing configuration or dependencies without need.
- Never put secrets in source code.
- Do not claim a feature works until it has been tested.

After each implementation batch, report:
- Files/features changed
- Commands/tests run and their actual results
- Required environment variables or setup steps
- Remaining issues and the next recommended task

**End goal:** a production-minded, source-grounded, accessible Islamic learning platform that helps users read, listen, memorize, understand, and practise consistently—while treating Quranic and religious content with the care and accuracy it deserves.
