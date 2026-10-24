# Islamic Learning Companion

A calm, mobile-first place to learn Islam a little every day: read and listen to the Quran,
memorize with spaced revision, learn duas and Salah, study stories and history, and follow the
Hijri calendar.

Religious accuracy comes first. The app never types or generates Quranic text, duas, hadith, or
references. Religious content is published only after a named reviewer approves it with its
sources — a rule enforced by the database. See [docs/SOURCES.md](docs/SOURCES.md) and
[docs/CONTENT_REVIEW.md](docs/CONTENT_REVIEW.md).

The product name, logo, and colours are easy to change: [src/config/brand.ts](src/config/brand.ts)
and the tokens at the top of [src/styles/index.css](src/styles/index.css).

## Quick start

Requires Node 22+.

```bash
npm install
npm run dev          # http://localhost:5173
```

With no configuration the app runs in **device-only mode**: everything works and progress is
saved in this browser. The Quran text and audio are streamed from AlQuran Cloud.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and production build |
| `npm run check` | Type check + lint + unit/integration/database tests |
| `npm test` | Vitest (unit, integration, and PGlite database tests) |
| `npm run test:e2e` | Playwright journeys and accessibility scans (first run: `npx playwright install chromium`) |
| `npm run quran:metadata` | Regenerate and validate surah metadata from the provider |
| `node scripts/fetch-quran-fixtures.mjs` | Regenerate the attributed first-verse test fixture |

## Accounts, sync, and the content admin (optional)

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations/` (SQL editor, or `supabase db push` with the
   Supabase CLI). Optionally run `supabase/seed.sql` to add draft placeholders.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   The anon key is public by design; row-level security protects every table.
4. In Supabase Auth, enable email sign-in and add your site URL (e.g. `http://localhost:5173`) as a
   redirect URL.
5. Sign in from **Settings → Account**, copy your account ID, and bootstrap the first admin once in
   the SQL editor:
   ```sql
   insert into public.user_roles (user_id, role) values ('<account-id>', 'admin');
   ```
   Further roles are granted from **/admin → Roles**.

Never put the service-role key in a `VITE_` variable or in the browser.

## Project layout

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). In short: pure, tested logic in `src/domain`,
adapters in `src/data`, feature UI in `src/features`, and SQL with row-level security in
`supabase/`.

## Status

What is built, partial, and pending is tracked in
[docs/IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md). The engineering for duas,
Salah guides, stories, knowledge courses, and occasion pages is complete and tested, but **no
religious content for them has been written or reviewed yet** — those areas show honest empty
states until reviewed content is published.

### Before a public launch

- Translation licence: Saheeh International via Tanzil is **non-commercial only**.
- Audio licence: the Islamic Network CDN is free for **non-commercial** use; reciters keep their
  copyrights.
- Run the migrations and the full sign-in, sync, and CMS flow against a real Supabase project
  (they are tested against Postgres via PGlite with Supabase's default privileges reproduced, not
  against hosted Supabase).
- Account deletion uses a `delete_my_account()` SQL function. Confirm it works on your hosted
  project; if the `postgres` role cannot delete from `auth.users` there, move it to an Edge Function
  that calls `auth.admin.deleteUser`.
- Have qualified reviewers write and approve the content backlog.
- Add a privacy notice and terms.
