# Content review

Religious content is the product's foundation, so it moves through a review workflow enforced by
the database, not by the interface.

## Workflow

```
Draft → In review → Changes requested ↺ / Approved → Published → Archived
```

| Transition | Who | Server rule (`transition_content`) |
|---|---|---|
| Draft / Changes requested → In review | Editor, Admin | — |
| In review → Approved / Changes requested | Reviewer, Admin | Nobody reviews content they created or have **ever** edited. A review record is stored for the exact version. |
| Approved → Published | Publisher, Admin | Religious content needs ≥ 1 source (each with a title) **and** an approval of the current version. Sample content needs a visible notice. |
| Approved → Changes requested | Reviewer, Publisher, Admin | — |
| Published → Archived / Draft | Publisher, Admin | — |
| Archived → Draft | Editor, Admin | — |

Content can only be edited in Draft or Changes requested. Any edit creates a new version, so an
approval never carries over to changed text. Workflow columns (status, version, author, reviewer,
review notes, publication date) cannot be set by editors — the database restores them on every
edit. Duas, Salah guides, stories, and occasions are always classed as religious, so they cannot be
relabelled to skip review. Every version and every action is recorded (`content_versions`,
`admin_audit_log`).

Learners never read the content table: they read the `published_content` view, which exposes only
published items and omits editorial notes, reviewer notes, and staff IDs.

When a staff member deletes their account, their content attribution and audit entries remain as
account IDs, so the review trail is preserved.

## Content classes

| Class | Meaning | Publishing requirement |
|---|---|---|
| `religious` | Makes religious claims: rulings, narrations, duas, Salah, history | Sources + named reviewer + approved current version |
| `linguistic` | Language material (e.g. Arabic letters) | Labelled "Language lesson" |
| `app-guide` | Explains the app, or structural items (categories, paths) | Labelled "App guide" |
| `sample` | Demonstration only | Must carry a visible notice |

The same rules are checked in three places: the Zod schemas (`src/domain/**/schema.ts`,
`library.ts`), the learner-facing gate (`isLearnerVisible`), and the database. A unit test fails if
any bundled religious item is published without sources and a reviewer.

## Authoring rules

- Enter Arabic text, sources, and gradings **exactly as they appear in the cited source**. Never
  paraphrase a dua and present it as verbatim.
- Attribute every grading (`authenticity.gradedBy`) and tie it to one of the item's sources.
- Keep explanations separate from source text (`explanatoryNotes`, `commentary` sections).
- In stories, label each passage `quran`, `hadith`, `historical`, or `commentary`. Reference Quran
  verses with `quranRefs` (e.g. `12:4-6`) rather than retyping verse text. Note where accounts
  differ (`differenceNote`). Do not invent dialogue, dates, or scenes. Do not depict prophets.
- In Salah guides, state the school followed (`schoolNote`) and where others differ. Mark each
  practice as obligatory, Sunnah, voluntary, or general guidance.
- The "match phrase to meaning" exercise for duas appears only when reviewed `phrases` are
  provided.
- Do not publish machine-translated religious content without review.

## Backlog — content that must be written and reviewed

Nothing below exists yet. `supabase/seed.sql` adds draft placeholders for some of it.

- **Duas:** all twelve categories are empty.
- **Salah:** all nine learning paths; the words of Salah (Takbir, Al-Fatiha by reference, Ruku and
  Sujud phrases, Tashahhud, Salawat); guides for the five daily prayers, Witr, Tahajjud, Duha,
  Janazah, Eid, and Tarawih.
- **Stories:** all six collections (Prophets, Seerah, early community, Rightly Guided Caliphs,
  civilizations, scholars).
- **Islamic Knowledge:** all eight topic areas.
- **Calendar:** learning content for each occasion; confirmation of each occasion's date rule;
  month pages (including which months are sacred, with sources).
- **Arabic lessons:** reviewer confirmation of the transliteration convention used.

## First admin

Roles are granted only by admins, through `set_user_role()`. Bootstrap the first admin once from
the Supabase SQL editor (which runs as the database owner):

```sql
insert into public.user_roles (user_id, role) values ('<account-id>', 'admin');
```

The account ID is shown in the app under Settings → Account.
