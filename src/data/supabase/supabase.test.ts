import { describe, expect, it, vi } from 'vitest';
import { bundledPacks } from '../content/bundled';
import { accountCacheKey, clearAccountCache, createLocalLearnerRepository } from '../learner/localRepository';
import { mergePacks, rowsToPacks, rowToRaw, emptyPacks, type ContentRow } from './contentRows';
import { createRemoteContentRepository } from './remoteContent';
import { createAccountLearnerRepository, type LearnerStateTable } from './learnerRepository';
import { fixtureDua, FIXTURE_SOURCE } from '@/test/fixtures/content';
import { createInitialLearnerState } from '@/domain/learner/schema';

function row(overrides: Partial<ContentRow> = {}): ContentRow {
  const { id: _id, slug: _s, title: _t, status: _st, contentClass: _c, review: _r, language: _l, ...payload } = fixtureDua() as Record<string, unknown>;
  return {
    id: '7d0e3f0a-0000-4000-8000-000000000001',
    content_type: 'dua',
    slug: 'cms-dua',
    title: 'CMS dua',
    language: 'en',
    content_class: 'religious',
    status: 'published',
    payload: payload as Record<string, unknown>,
    version: 3,
    author_id: null,
    updated_by: null,
    reviewer_name: 'Test Reviewer',
    reviewed_at: '2026-02-01T10:00:00Z',
    review_notes: null,
    published_at: '2026-02-02T10:00:00Z',
    updated_at: '2026-02-02T10:00:00Z',
    ...overrides,
  };
}

describe('CMS rows', () => {
  it('maps a row into a pack item with review metadata from workflow columns only', () => {
    const raw = rowToRaw(row({ payload: { ...row().payload, review: { reviewer: 'Forged', reviewedOn: '2020-01-01', version: 9 } } }));
    expect(raw).toMatchObject({ slug: 'cms-dua', status: 'published', contentClass: 'religious', review: { reviewer: 'Test Reviewer', reviewedOn: '2026-02-01', version: 3 } });
  });

  it('merges remote items over bundled ones by slug', () => {
    const base = { ...emptyPacks(), duaCategories: [{ slug: 'travel', title: 'Old' }, { slug: 'home', title: 'Home' }] };
    const overlay = { ...emptyPacks(), duaCategories: [{ slug: 'travel', title: 'New' }] };
    expect(mergePacks(base, overlay).duaCategories).toEqual([{ slug: 'home', title: 'Home' }, { slug: 'travel', title: 'New' }]);
  });

  it('serves published, valid CMS content alongside bundled content', async () => {
    const repo = createRemoteContentRepository({
      bundled: bundledPacks,
      fetchPublishedRows: async () => [row(), row({ slug: 'cms-draft', status: 'draft' }), row({ slug: 'cms-unsourced', payload: { ...row().payload, sources: [] } }), { nonsense: true }],
    });
    const duas = await repo.listDuas();
    expect(duas.map((d) => d.slug)).toEqual(['cms-dua']);
    expect((await repo.listCourses()).map((c) => c.slug)).toContain('arabic-letters');
    expect(rowsToPacks([row()]).duas).toHaveLength(1);
  });

  it('falls back to bundled content when the backend is unreachable, and retries later', async () => {
    const onError = vi.fn();
    const fetchPublishedRows = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([row()]);
    const repo = createRemoteContentRepository({ bundled: bundledPacks, fetchPublishedRows, onError });
    expect(await repo.listDuas()).toEqual([]);
    expect(onError).toHaveBeenCalled();
    expect((await repo.listDuas()).map((d) => d.slug)).toEqual(['cms-dua']);
  });
});

describe('account learner repository', () => {
  const clock = () => new Date('2026-03-01T09:00:00Z');
  const guest = () => createLocalLearnerRepository(clock);
  const cacheFor = (userId: string) => createLocalLearnerRepository(clock, undefined, accountCacheKey(userId));
  function fakeTable(initial: Record<string, unknown> = {}, fail = false): LearnerStateTable & { rows: Map<string, unknown> } {
    const rows = new Map<string, unknown>(Object.entries(initial));
    return {
      rows,
      fetch: async (id) => (fail ? { data: null, error: { message: 'down' } } : { data: rows.has(id) ? { data: rows.get(id) } : null, error: null }),
      upsert: async (r) => {
        rows.set(r.user_id, r.data);
        return { error: null };
      },
      remove: async (id) => {
        rows.delete(id);
        return { error: null };
      },
    };
  }
  const withBookmark = (ref: string) => ({
    ...createInitialLearnerState(clock(), 'UTC'),
    bookmarks: [{ id: ref, kind: 'verse' as const, ref, label: ref, createdAt: clock().toISOString() }],
  });

  it('carries guest progress into an account on its first sign-in', async () => {
    const device = guest();
    await device.save(withBookmark('1:1'), []);
    const table = fakeTable();
    const { state, notice } = await createAccountLearnerRepository({ userId: 'u1', table, cache: cacheFor('u1'), device }).load();
    expect(state.bookmarks.map((b) => b.ref)).toEqual(['1:1']);
    expect(notice).toMatch(/now saved to your account/);
    expect((table.rows.get('u1') as { bookmarks: unknown[] }).bookmarks).toHaveLength(1);
  });

  it('prefers the account copy and caches it under that account only', async () => {
    const remote = withBookmark('2:255');
    const repo = createAccountLearnerRepository({ userId: 'u1', table: fakeTable({ u1: remote }), cache: cacheFor('u1'), device: guest() });
    expect((await repo.load()).state.bookmarks[0]?.ref).toBe('2:255');
    expect((await cacheFor('u1').load()).state.bookmarks[0]?.ref).toBe('2:255');
    // Device-only (guest) storage is untouched.
    expect((await guest().load()).isNew).toBe(true);
  });

  it('never gives one account another account’s cached progress on a shared device', async () => {
    const table = fakeTable({ a: withBookmark('18:10') });
    await createAccountLearnerRepository({ userId: 'a', table, cache: cacheFor('a'), device: guest() }).load();
    clearAccountCache('a'); // signing out
    expect(localStorage.getItem(accountCacheKey('a'))).toBeNull();

    const b = await createAccountLearnerRepository({ userId: 'b', table, cache: cacheFor('b'), device: guest() }).load();
    expect(b.state.bookmarks).toEqual([]);
    expect((table.rows.get('b') as { bookmarks: unknown[] }).bookmarks).toEqual([]);
  });

  it('falls back to this account’s cache when the account is unreachable', async () => {
    await cacheFor('u1').save(withBookmark('3:1'), []);
    const { state, notice } = await createAccountLearnerRepository({ userId: 'u1', table: fakeTable({}, true), cache: cacheFor('u1'), device: guest() }).load();
    expect(state.bookmarks[0]?.ref).toBe('3:1');
    expect(notice).toMatch(/couldn’t be reached/);
  });

  it('never overwrites when the account copy is unreadable', async () => {
    const table = fakeTable({ u1: { schemaVersion: 42 } });
    const repo = createAccountLearnerRepository({ userId: 'u1', table, cache: cacheFor('u1'), device: guest() });
    expect((await repo.load()).notice).toMatch(/couldn’t be read/);
    expect(table.rows.get('u1')).toEqual({ schemaVersion: 42 });
  });

  it('keeps fixtures honest', () => {
    expect(FIXTURE_SOURCE.title).toMatch(/not a real reference/);
  });
});
