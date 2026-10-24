# Architecture

## Stack

React 19 · TypeScript 6 · Vite 8 · React Router 8 · Tailwind CSS 4 · Zod 4 · TanStack Query 5 ·
Supabase (Postgres, Auth) · Vitest + Testing Library · PGlite (database tests) · Playwright + axe.

TypeScript is held at 6.0 because `typescript-eslint` does not yet support 7.

## Layers

```
src/
  config/      brand and environment (validated with Zod)
  domain/      pure logic — no React, no I/O. Fully unit-tested.
    learner/     state schema, goals, and every state transition (actions.ts)
    plan/        rule-based daily plan engine
    srs/         spaced-repetition scheduler (Again / Difficult / Good / Easy)
    lessons/     lesson & question schemas, answer evaluation
    content/     content model, publishing gate, workflow mirror, search
    quran/       metadata, integrity checks, Bismillah/BOM rules, search
    hijri/       ICU-based Hijri conversion and occasion date rules
    memorization/ status derivation, range validation
    progress/    statistics and milestones
  data/        adapters for persistence and external services
    learner/     LearnerRepository interface, localStorage implementation, LearnerStore
    content/     catalogue builder (validates packs) and learner-facing ContentRepository
    quran/       QuranProvider interface and the AlQuran Cloud adapter
    supabase/    client loader, CMS row mapping, account-backed learner repository, admin API
  content/     bundled content packs (non-religious only)
  app/         providers, routes, layout, data hooks
  components/  shared UI (accessible primitives) and content components
  features/    one folder per area: dashboard, lesson, quran, memorization, duas, …
supabase/      SQL migrations (schema, RLS, workflow) and a dev seed
tests/db/      migration + RLS tests on real Postgres (PGlite)
e2e/           Playwright journeys and accessibility scans
```

UI calls pure domain functions through the learner store; adapters isolate everything external, so
the Quran provider, persistence, and content source can each be swapped.

## Key decisions

### Local-first, with an optional account
Without Supabase configured the app is fully usable, storing data in `localStorage` (validated on
every load; unreadable data is backed up, never silently discarded). When Supabase is configured,
signing in swaps the store for an account-backed repository that keeps a local cache. On first
sign-in, device progress is carried into the account. Guest mode is not "fake auth": it is an
honest device-only mode, and admin features require a real, server-checked account.

### Learner state as one validated document
The spec suggests one table per concept (bookmarks, lesson_progress, revision_schedule, …). The
app instead keeps learner state as a single Zod-validated document (`learner_state.data`, owner-
only RLS). Reasons: every rule lives in pure, tested functions; offline use and sync are simple and
atomic; and the server never needs to query inside a learner's data (privacy by default, minimal
analytics). Trade-offs: no server-side queries over learner progress, and concurrent edits from two
devices are last-write-wins. If cross-device conflict handling or server-side reporting becomes
necessary, the document can be split into tables without changing the domain layer.

### Content as validated packs with a CMS overlay
All content — bundled or from the CMS — is parsed by the same Zod schemas and passes through one
publishing gate (`isLearnerVisible`). CMS rows store type-specific fields as JSONB; review metadata
comes only from workflow columns, so editors cannot forge it in the payload. Remote content is
layered over the bundled packs by slug, and the app falls back to bundled content if the backend is
unreachable.

### Authorization lives in the database
Every table has RLS. Status changes are only possible through `transition_content()`, which checks
the role for each transition, forbids review by anyone who created or edited the item, and requires
sources and an approval of the exact version before religious content can be published. A
`SECURITY INVOKER` trigger restores all workflow columns on ordinary edits; it recognises the
workflow function only by both a transaction flag and the definer's role, which a client cannot
produce. Every function's `EXECUTE` privilege is revoked from `public` and `anon` explicitly,
because Supabase grants it to the API roles by default. Learners read published content through the
`published_content` view (owner rights, its own `status = 'published'` filter, select-only); the
content table is staff-only. Supabase's linter will flag this as a "security definer view" — that is
intentional.

The admin UI mirrors the rules (`src/domain/content/workflow.ts`) only to decide which buttons to
show. `tests/db/rls.test.ts` runs the real migration in Postgres — with Supabase's default privileges
reproduced — as different users, including attempts to forge workflow columns.

### Accounts on shared devices
Each signed-in account keeps its own offline cache, separate from device-only (guest) data, and the
cache is cleared on sign-out. Only guest data is ever carried into an account, on that account's
first sign-in.

### Quran integrity
Surah metadata is generated from the provider and checked against canonical totals. Every surah is
checked on arrival (verse count, numbering, global numbers, non-empty). Only two documented display
rules touch the text (see `SOURCES.md`). Tests never contain real or invented Quranic text: they use
the provider's own first verses (attributed fixture) or obvious placeholders.

### Daily plan without AI
`domain/plan/engine.ts` builds candidates in priority order — overdue revision, unfinished work,
then goal-matched published content — and fits them to the daily time budget. Learners can skip,
swap, reorder, or remove items; a customized plan is never overwritten.

### Hijri calendar
Dates come from ICU calendars on the device; the method and local adjustment are explicit, and every
date is labelled as an estimate. Unsupported calendars are detected (ICU silently falls back to
Gregorian) and reported.

## Performance and accessibility

- Every page is code-split; supabase-js is loaded only when a backend is configured.
- Quran text is fetched per surah and cached; audio is fetched only when the learner presses play.
- Fonts are self-hosted (Inter, Amiri Quran, Amiri).
- Semantic landmarks, skip link, focus moved to the page on navigation, visible focus, large touch
  targets, `lang`/`dir` on all Arabic, live regions for feedback, reduced-motion support, and status
  never conveyed by colour alone. Playwright runs axe (WCAG 2.2 AA tags) on the main pages.
