// @vitest-environment node
// Runs the real migration against Postgres (PGlite) and checks authorization as different
// users. These tests are the evidence that security does not depend on the UI.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../..', import.meta.url));
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const USERS = {
  alice: '00000000-0000-4000-8000-00000000000a', // learner
  bob: '00000000-0000-4000-8000-00000000000b', // learner
  admin: '00000000-0000-4000-8000-0000000000ad',
  editor: '00000000-0000-4000-8000-0000000000ed',
  editor2: '00000000-0000-4000-8000-0000000000e2', // editor who also reviews
  reviewer: '00000000-0000-4000-8000-0000000000ae',
  publisher: '00000000-0000-4000-8000-0000000000bb',
} as const;
type User = keyof typeof USERS;

let db: PGlite;

async function as<T>(user: User | null, fn: () => Promise<T>): Promise<T> {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user ? USERS[user] : '']);
  await db.exec(user ? 'set role authenticated' : 'set role anon');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

const rows = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;
const SOURCE = [{ id: 's1', type: 'book', title: 'A source' }];

async function createDraft(user: User, fields: { slug: string; type?: string; contentClass?: string; payload?: object }) {
  return as(user, async () => {
    const [row] = await rows<{ id: string }>(
      `insert into content_items (content_type, slug, title, content_class, payload) values ($1::content_type, $2, 'Title', $3, $4) returning id`,
      [fields.type ?? 'dua', fields.slug, fields.contentClass ?? 'religious', JSON.stringify(fields.payload ?? { sources: SOURCE })],
    );
    return row!.id;
  });
}

const transition = (user: User | null, id: string, to: string, notes?: string) =>
  as(user, () => rows(`select status from transition_content($1, $2::publication_status, $3)`, [id, to, notes ?? null]));

async function publish(id: string) {
  await transition('editor', id, 'in_review');
  await transition('reviewer', id, 'approved');
  await transition('publisher', id, 'published');
}

const item = async (id: string) => (await rows<Record<string, unknown>>('select * from content_items where id = $1', [id]))[0]!;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(read('tests/db/supabase-shim.sql'));
  await db.exec(read('supabase/migrations/20261024000000_init.sql'));
  for (const id of Object.values(USERS)) await db.query('insert into auth.users (id) values ($1)', [id]);
  // Bootstrap roles as the database owner (in production: SQL editor or service role).
  for (const [user, role] of [
    ['admin', 'admin'],
    ['editor', 'editor'],
    ['editor2', 'editor'],
    ['editor2', 'reviewer'],
    ['reviewer', 'reviewer'],
    ['publisher', 'publisher'],
  ] as const) {
    await db.query('insert into user_roles (user_id, role) values ($1, $2)', [USERS[user], role]);
  }
  await db.query(`update profiles set display_name = 'Rev. Example' where id = $1`, [USERS.reviewer]);
}, 60_000);

describe('learner data is private to its owner', () => {
  it('creates a profile for each new account', async () => {
    expect(await rows('select id from profiles')).toHaveLength(Object.keys(USERS).length);
  });

  it('lets a learner store and read their own state', async () => {
    await as('alice', () => rows(`insert into learner_state (user_id, schema_version, data) values ($1, 1, '{"goals":["salah"]}')`, [USERS.alice]));
    expect(await as('alice', () => rows('select data from learner_state'))).toEqual([{ data: { goals: ['salah'] } }]);
  });

  it('hides one learner’s data from other learners, anonymous visitors, and staff', async () => {
    expect(await as('bob', () => rows('select * from learner_state'))).toEqual([]);
    expect(await as(null, () => rows('select * from learner_state'))).toEqual([]);
    expect(await as('admin', () => rows('select * from learner_state'))).toEqual([]);
  });

  it('prevents writing another learner’s data', async () => {
    await expect(as('bob', () => rows(`insert into learner_state (user_id, schema_version, data) values ($1, 1, '{}')`, [USERS.alice]))).rejects.toThrow(/row-level security/);
    expect(await as('bob', () => rows(`update learner_state set data = '{"hacked":true}' where user_id = $1 returning user_id`, [USERS.alice]))).toEqual([]);
    expect((await rows<{ data: object }>('select data from learner_state where user_id = $1', [USERS.alice]))[0]!.data).toEqual({ goals: ['salah'] });
  });

  it('rejects non-object state documents', async () => {
    await expect(as('bob', () => rows(`insert into learner_state (user_id, schema_version, data) values ($1, 1, '[1,2]')`, [USERS.bob]))).rejects.toThrow(/check constraint/);
  });

  it('keeps profiles owner-only, including from admins', async () => {
    expect(await as('bob', () => rows('select id from profiles'))).toEqual([{ id: USERS.bob }]);
    expect(await as('admin', () => rows('select id from profiles'))).toEqual([{ id: USERS.admin }]);
  });
});

describe('roles', () => {
  it('lets users see only their own roles', async () => {
    expect(await as('editor', () => rows('select role from user_roles'))).toEqual([{ role: 'editor' }]);
    expect(await as('alice', () => rows('select role from user_roles'))).toEqual([]);
  });

  it('blocks role changes except through the admin-only function', async () => {
    await expect(as('alice', () => rows(`insert into user_roles (user_id, role) values ($1, 'admin')`, [USERS.alice]))).rejects.toThrow(/row-level security/);
    await expect(as('editor', () => rows(`select set_user_role($1, 'admin', true)`, [USERS.editor]))).rejects.toThrow(/only admins/i);
    await as('admin', () => rows(`select set_user_role($1, 'reviewer', true)`, [USERS.bob]));
    expect(await as('bob', () => rows('select role from user_roles'))).toEqual([{ role: 'reviewer' }]);
    await as('admin', () => rows(`select set_user_role($1, 'reviewer', false)`, [USERS.bob]));
    expect(await as('bob', () => rows('select role from user_roles'))).toEqual([]);
    await expect(as('admin', () => rows(`select set_user_role($1, 'admin', false)`, [USERS.admin]))).rejects.toThrow(/own admin role/);
  });
});

describe('function privileges (Supabase grants EXECUTE to API roles by default)', () => {
  it('denies anonymous visitors every workflow and account function', async () => {
    for (const sql of [
      `select transition_content('00000000-0000-4000-8000-000000000000', 'in_review')`,
      `select set_user_role('00000000-0000-4000-8000-000000000000', 'admin', true)`,
      `select delete_my_account()`,
    ]) {
      await expect(as(null, () => rows(sql))).rejects.toThrow(/permission denied for function/);
    }
  });

  it('keeps internal helpers off the API entirely', async () => {
    await expect(as('editor', () => rows(`select publishing_problems(c) from content_items c limit 1`))).rejects.toThrow(/permission denied for function/);
  });
});

describe('content workflow', () => {
  it('only lets editors create content, always as a draft authored by themselves', async () => {
    await expect(createDraft('alice', { slug: 'learner-attempt' })).rejects.toThrow(/row-level security/);
    await expect(createDraft('reviewer', { slug: 'reviewer-attempt' })).rejects.toThrow(/row-level security/);
    const id = await createDraft('editor', { slug: 'draft-one' });
    expect(await item(id)).toMatchObject({ status: 'draft', author_id: USERS.editor, version: 1 });
  });

  it('ties religious content types to the religious class', async () => {
    await expect(createDraft('editor', { slug: 'relabelled', contentClass: 'app-guide' })).rejects.toThrow(/content_class_matches_type/);
    const id = await createDraft('editor', { slug: 'class-swap' });
    await expect(as('editor', () => rows(`update content_items set content_class = 'sample' where id = $1`, [id]))).rejects.toThrow(/content_class_matches_type/);
  });

  it('never exposes the content table to learners or anonymous visitors', async () => {
    expect(await as(null, () => rows(`select id from content_items`))).toEqual([]);
    expect(await as('alice', () => rows(`select id from content_items`))).toEqual([]);
    expect((await as('reviewer', () => rows(`select id from content_items where slug = 'draft-one'`))).length).toBe(1);
  });

  it('blocks direct status changes and content-type changes', async () => {
    const id = await createDraft('editor', { slug: 'sneaky' });
    await expect(as('editor', () => rows(`update content_items set status = 'published' where id = $1`, [id]))).rejects.toThrow(/transition_content/);
    await expect(as('editor', () => rows(`update content_items set content_type = 'course' where id = $1`, [id]))).rejects.toThrow(/cannot be changed/);
  });

  it('ignores attempts to forge workflow columns, and stamps the real editor', async () => {
    const id = await createDraft('editor', { slug: 'forgery' });
    await as('editor2', () =>
      rows(
        `update content_items set version = 99, review_notes = 'Verified by scholar board', reviewer_name = 'Forged', reviewed_by = $2, author_id = $2, updated_by = $2, published_at = now() where id = $1`,
        [id, USERS.reviewer],
      ),
    );
    expect(await item(id)).toMatchObject({ version: 1, review_notes: null, reviewer_name: null, reviewed_by: null, author_id: USERS.editor, updated_by: USERS.editor2, published_at: null });
  });

  it('runs draft → in review → approved → published with the right roles', async () => {
    const id = await createDraft('editor', { slug: 'full-flow' });
    await expect(transition('alice', id, 'in_review')).rejects.toThrow(/role does not allow/);
    expect(await transition('editor', id, 'in_review')).toEqual([{ status: 'in_review' }]);
    // Editing is locked while in review.
    expect(await as('editor', () => rows(`update content_items set title = 'Changed' where id = $1 returning id`, [id]))).toEqual([]);
    await expect(transition('editor', id, 'approved')).rejects.toThrow(/role does not allow/);
    await expect(transition('publisher', id, 'published')).rejects.toThrow(/cannot move content from in_review to published/i);
    expect(await transition('reviewer', id, 'approved', 'Checked against the source')).toEqual([{ status: 'approved' }]);
    await expect(transition('reviewer', id, 'published')).rejects.toThrow(/role does not allow/);
    expect(await transition('publisher', id, 'published')).toEqual([{ status: 'published' }]);
    expect(await item(id)).toMatchObject({ status: 'published', reviewer_name: 'Rev. Example', review_notes: 'Checked against the source' });
  });

  it('serves learners published content through a view without internal fields', async () => {
    const id = await createDraft('editor', { slug: 'with-notes', payload: { sources: SOURCE, editorialNotes: 'Internal: check chapter numbering' } });
    await publish(id);
    const [pub] = await as(null, () => rows<Record<string, unknown>>(`select * from published_content where id = $1`, [id]));
    expect(pub).toMatchObject({ status: 'published', reviewer_name: 'Rev. Example', author_id: null, updated_by: null, review_notes: null });
    expect(pub!.payload).toEqual({ sources: SOURCE });
    expect(await as('alice', () => rows(`select slug from published_content where status <> 'published'`))).toEqual([]);
    expect(await as(null, () => rows(`select slug from published_content where slug = 'draft-one'`))).toEqual([]);
  });

  it('does not allow writing through the learner view', async () => {
    await expect(as('alice', () => rows(`update published_content set title = 'x'`))).rejects.toThrow(/permission denied/);
    await expect(as(null, () => rows(`insert into published_content (content_type, slug, title, content_class) values ('dua', 'x', 'x', 'religious')`))).rejects.toThrow(/permission denied/);
  });

  it('does not let anyone review their own work', async () => {
    const id = await createDraft('admin', { slug: 'self-review' });
    await transition('admin', id, 'in_review');
    await expect(transition('admin', id, 'approved')).rejects.toThrow(/cannot review content you wrote or edited/);
  });

  it('does not let a co-editor approve text they changed, even if someone edits after them', async () => {
    const id = await createDraft('editor', { slug: 'co-edited' });
    await as('editor2', () => rows(`update content_items set title = 'Rewritten by editor2' where id = $1`, [id]));
    await as('editor', () => rows(`update content_items set title = 'Touched up by editor' where id = $1`, [id]));
    await transition('editor', id, 'in_review');
    await expect(transition('editor2', id, 'approved')).rejects.toThrow(/cannot review content you wrote or edited/);
    expect(await transition('reviewer', id, 'approved')).toEqual([{ status: 'approved' }]);
  });

  it('refuses to publish religious content without proper sources, with a clear reason', async () => {
    const none = await createDraft('editor', { slug: 'no-sources', payload: { sources: [] } });
    await transition('editor', none, 'in_review');
    await transition('reviewer', none, 'approved');
    await expect(transition('publisher', none, 'published')).rejects.toThrow('Cannot publish: Religious content needs at least one source.');

    const bad = await createDraft('editor', { slug: 'bad-sources', payload: { sources: [null, { title: ' ' }] } });
    await transition('editor', bad, 'in_review');
    await transition('reviewer', bad, 'approved');
    await expect(transition('publisher', bad, 'published')).rejects.toThrow('Cannot publish: Every source needs a title.');
  });

  it('requires an approval of the exact version being published', async () => {
    const id = await createDraft('editor', { slug: 'changed-after' });
    await transition('editor', id, 'in_review');
    await transition('reviewer', id, 'changes_requested', 'Please cite the chapter');
    await as('editor', () => rows(`update content_items set title = 'Revised' where id = $1`, [id]));
    await transition('editor', id, 'in_review');
    expect((await item(id)).version).toBe(2);
    const reviews = await as('reviewer', () => rows<{ version: number; decision: string }>('select version, decision from content_reviews where content_id = $1', [id]));
    expect(reviews).toEqual([{ version: 1, decision: 'changes_requested' }]);
    await transition('reviewer', id, 'approved');
    expect(await transition('publisher', id, 'published')).toEqual([{ status: 'published' }]);
  });

  it('records version history and an audit trail visible only to the right people', async () => {
    const [{ id }] = (await rows<{ id: string }>(`select id from content_items where slug = 'changed-after'`)) as [{ id: string }];
    const versions = await as('reviewer', () => rows<{ kind: string; status: string }>('select kind, status from content_versions where content_id = $1 order by id', [id]));
    expect(versions.map((v) => `${v.kind}:${v.status}`)).toEqual([
      'create:draft',
      'status:in_review',
      'status:changes_requested',
      'edit:changes_requested',
      'status:in_review',
      'status:approved',
      'status:published',
    ]);
    expect(await as('alice', () => rows('select * from content_versions'))).toEqual([]);
    const audit = await as('admin', () => rows<{ action: string }>(`select action from admin_audit_log where entity_id = $1 order by id`, [id]));
    expect(audit.map((a) => a.action)).toEqual(['content.create', 'content.transition', 'content.transition', 'content.edit', 'content.transition', 'content.transition', 'content.transition']);
    expect(await as('editor', () => rows('select * from admin_audit_log'))).toEqual([]);
  });

  it('lets publishers archive, and only admins delete drafts or archived items', async () => {
    const [{ id }] = (await rows<{ id: string }>(`select id from content_items where slug = 'full-flow'`)) as [{ id: string }];
    expect(await as('editor', () => rows('delete from content_items where id = $1 returning id', [id]))).toEqual([]);
    expect(await transition('publisher', id, 'archived')).toEqual([{ status: 'archived' }]);
    expect(await as(null, () => rows('select id from published_content where id = $1', [id]))).toEqual([]);
    expect(await as('admin', () => rows('delete from content_items where id = $1 returning id', [id]))).toHaveLength(1);
  });
});

describe('account deletion', () => {
  it('removes a learner’s account and all their data', async () => {
    await as('alice', () => rows('select delete_my_account()'));
    expect(await rows('select * from learner_state where user_id = $1', [USERS.alice])).toEqual([]);
    expect(await rows('select * from profiles where id = $1', [USERS.alice])).toEqual([]);
  });

  it('works for staff with content, keeping attribution and the audit trail', async () => {
    const count = async () => (await rows<{ n: number }>('select count(*)::int as n from admin_audit_log where actor_id = $1', [USERS.editor2]))[0]!.n;
    const before = await count();
    expect(before).toBeGreaterThan(0);
    await as('editor2', () => rows('select delete_my_account()'));
    expect(await rows('select id from auth.users where id = $1', [USERS.editor2])).toEqual([]);
    expect(await count()).toBe(before);
    expect((await rows(`select id from content_items where updated_by = $1`, [USERS.editor2])).length).toBeGreaterThan(0);
  });
});

describe('development seed', () => {
  it('adds only drafts, invisible to learners', async () => {
    await db.exec(read('supabase/seed.sql'));
    const seeded = await rows<{ status: string }>(`select status from content_items where slug in ('five-pillars', 'prophet-yusuf')`);
    expect(seeded.map((s) => s.status)).toEqual(['draft', 'draft']);
    expect(await as(null, () => rows(`select slug from published_content where slug = 'five-pillars'`))).toEqual([]);
  });
});
