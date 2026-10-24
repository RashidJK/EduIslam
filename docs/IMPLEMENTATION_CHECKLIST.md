# Implementation checklist

Status against `docs/SPEC.md`. ✅ done and tested · 🟡 partial · ⬜ not started · 📝 needs reviewed content (the feature works; publishing content is a review task, not an engineering one).

## Foundation (spec §3, §18–21)
- ✅ Design tokens (light/dark), responsive shell, desktop sidebar, mobile bar + "More" sheet, all routes
- ✅ Local-first persistence with validation and safe recovery
- ✅ Supabase schema, RLS, workflow functions, audit log — tested on Postgres (PGlite); independent security review completed and its findings fixed
- 🟡 Supabase Auth (email magic link), account sync, account deletion — implemented; **not yet run against a live Supabase project**
- ✅ `.env.example`, no secrets in source, supabase-js loaded only when configured

## Onboarding & dashboard (§2, §4)
- ✅ Goals, experience, daily time, reminder, language; skippable; editable in Settings
- ✅ Rule-based daily plan: revision first, resume unfinished, goal-matched, time budget; skip/swap/reorder/remove/rebuild
- ✅ Continue learning, revision due, Quran progress (reading ≠ memorization), calendar preview, optional weekly activity, explore
- 🟡 Reminders: stored and shown in-app after the chosen time; device notifications ⬜

## Quran (§5, §6)
- ✅ 114 surahs, search, reader with RTL Uthmani text, translation toggle, font size, focus mode
- ✅ Bookmarks, automatic reading position, resume, recent reading
- ✅ Verse-by-verse audio, highlight of the playing verse, repeat verse ×3 / verse loop / range / surah, speed, favourites, history
- ✅ Integrity checks, provider adapter, licence metadata, offline/error/integrity states
- ⬜ Full-text verse search (needs a search-capable provider endpoint)
- ⬜ Repeat-after-reciter practice mode; offline downloads (must honour licences)

## Memorization (§7)
- ✅ Guided session: listen → read along → repeat → recall hidden → reveal & rate → scheduled
- ✅ Statuses derived from review history; SM-2-style scheduler with explanations; notes; archive/delete
- ✅ Due reviews feed the daily plan and dashboard
- ⬜ Recitation recording / pronunciation feedback (later phase; needs consent design and a validated model)

## Duas & Salah (§8, §9)
- ✅ Dua library: search, editable categories, detail (text, transliteration, translation, usage, sources, grading attribution, review), favourites, add to plan
- ✅ Dua practice: follow, show/hide transliteration, phrase matching (only with reviewed phrase data), hidden recall, SRS
- ✅ Salah hub (9 paths), step-by-step guide player with recitations, "why this matters", school notes, progress & resume
- 📝 No duas or Salah guides published yet

## Stories, knowledge, calendar (§10–12)
- ✅ Story collections, chapter reader with labelled passages (Quran/hadith/historical/commentary), Quran links, "accounts differ", reflections, knowledge check, mark read / resume
- ✅ Islamic Knowledge areas (8) with course listings
- ✅ Hijri calendar: today (method + adjustment), 12 months, month pages, upcoming occasions, occasion pages, uncertainty notes, unsupported-device fallback
- ⬜ Occasion reminders
- 📝 No stories, knowledge courses, or occasion content published yet

## Learning engine & progress (§13, §14)
- ✅ Lesson schema and player; question types: single choice, multi-select, match pairs, order steps, fill blank, listen-and-select, reflection, recall
- ✅ Explanatory feedback, resume mid-lesson, completion updates progress and plan
- ✅ Progress page: lessons, approximate time, weekly chart, weekly target, reading vs memorization, revision queue, other areas, gentle milestones

## Search (§15)
- ✅ Global search over surahs, courses, lessons, duas, categories, Salah, stories, chapters, occasions, months — published content only, with type and review status

## Admin CMS (§17)
- ✅ Roles (admin/editor/reviewer/publisher) enforced in the database; role management for admins
- ✅ Draft editor with schema validation, publishing checks, learner-view preview, workflow actions, version and review history, audit log
- 🟡 Content is edited as JSON fields per type; dedicated per-type forms ⬜
- ⬜ Product health metrics view

## AI features (§16)
- ⬜ Intentionally not built. The MVP works without AI.

## Quality (§22)
- ✅ Unit and integration tests (Vitest), database authorization tests (PGlite), end-to-end journeys and axe scans (Playwright)
- Spec E2E journeys: 1 ✅ · 2 ✅ · 3 ✅ integration (fixture content) · 4 ✅ · 5 ✅ integration (fixture content) · 6 ✅ integration (fixture content) · 7 ✅ database + UI integration · 8 ✅ database + E2E
