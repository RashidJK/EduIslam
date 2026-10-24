import { describe, expect, it, vi } from 'vitest';
import { createLocalLearnerRepository, LEARNER_STORAGE_KEY } from './localRepository';
import { LearnerStore } from './store';
import { addBookmark, completeOnboarding } from '@/domain/learner/actions';
import { createInitialLearnerState } from '@/domain/learner/schema';

const clock = () => new Date('2026-03-01T09:00:00Z');

describe('local learner repository', () => {
  it('persists across store instances (simulating a page reload)', async () => {
    const store = new LearnerStore(createLocalLearnerRepository(clock), clock);
    await store.load();
    store.update(['bookmarks'], (s, now) => addBookmark(s, { kind: 'verse', ref: '2:255', label: 'x' }, now));
    await store.flush();

    const reloaded = new LearnerStore(createLocalLearnerRepository(clock), clock);
    await reloaded.load();
    expect(reloaded.getSnapshot().state?.bookmarks.map((b) => b.ref)).toEqual(['2:255']);
  });

  it('starts fresh but keeps a backup when stored data is unreadable', async () => {
    localStorage.setItem(LEARNER_STORAGE_KEY, '{"schemaVersion": 99}');
    const store = new LearnerStore(createLocalLearnerRepository(clock), clock);
    await store.load();
    expect(store.getSnapshot().state?.profile.onboarding).toBe('not-started');
    expect(store.getSnapshot().notice).toMatch(/couldn't read/);
    const backups = Object.keys(localStorage).filter((k) => k.startsWith(`${LEARNER_STORAGE_KEY}.unreadable.`));
    expect(backups).toHaveLength(1);
    expect(localStorage.getItem(backups[0]!)).toBe('{"schemaVersion": 99}');
  });

  it('falls back to memory when storage is unavailable, and says so', async () => {
    const repo = createLocalLearnerRepository(clock, null);
    expect(repo.kind).toBe('memory');
    const { notice } = await repo.load();
    expect(notice).toMatch(/blocking storage/);
  });

  it('applies rapid updates in sequence without losing any', async () => {
    const store = new LearnerStore(createLocalLearnerRepository(clock), clock);
    await store.load();
    for (const ref of ['1:1', '1:2', '1:3']) store.update(['bookmarks'], (s, now) => addBookmark(s, { kind: 'verse', ref, label: ref }, now));
    await store.flush();
    const saved = JSON.parse(localStorage.getItem(LEARNER_STORAGE_KEY)!);
    expect(saved.bookmarks).toHaveLength(3);
  });

  it('surfaces save failures without losing in-memory progress', async () => {
    const repo = createLocalLearnerRepository(clock);
    vi.spyOn(repo, 'save').mockRejectedValueOnce(new Error('quota'));
    const store = new LearnerStore(repo, clock);
    await store.load();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    store.update(['profile'], (s, now) =>
      completeOnboarding(s, { goals: ['salah'], dailyMinutes: 5, quranReadingLevel: null, memorizationStage: null, reminder: { enabled: false, time: '19:00' } }, now),
    );
    await store.flush();
    expect(store.getSnapshot().saveError).toMatch(/could not be saved/);
    expect(store.getSnapshot().state?.profile.onboarding).toBe('completed');
  });

  it('reset clears stored data', async () => {
    const store = new LearnerStore(createLocalLearnerRepository(clock), clock);
    await store.load();
    store.update(['bookmarks'], (s, now) => addBookmark(s, { kind: 'verse', ref: '1:1', label: 'x' }, now));
    await store.flush();
    await store.reset(createInitialLearnerState(clock(), 'UTC'));
    expect(localStorage.getItem(LEARNER_STORAGE_KEY)).toBeNull();
    expect(store.getSnapshot().state?.bookmarks).toEqual([]);
  });
});
