// A small external store for learner state. Changes are applied synchronously with pure
// domain functions (so rapid updates never overwrite each other) and persisted in order.
import type { LearnerState } from '@/domain/learner/schema';
import type { Clock } from '@/domain/time';
import type { LearnerArea, LearnerRepository } from './repository';

export interface LearnerSnapshot {
  status: 'loading' | 'ready';
  state: LearnerState | null;
  notice: string | null;
  saveError: string | null;
}

export type Recipe = (state: LearnerState, now: Date) => LearnerState;

export class LearnerStore {
  private snapshot: LearnerSnapshot = { status: 'loading', state: null, notice: null, saveError: null };
  private listeners = new Set<() => void>();
  private saving: Promise<void> = Promise.resolve();
  private readonly repo: LearnerRepository;
  readonly clock: Clock;

  constructor(repo: LearnerRepository, clock: Clock) {
    this.repo = repo;
    this.clock = clock;
  }

  get repository(): LearnerRepository {
    return this.repo;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private set(patch: Partial<LearnerSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  async load(): Promise<void> {
    const { state, notice } = await this.repo.load();
    this.set({ status: 'ready', state, notice: notice ?? null });
  }

  /** Applies a change and persists it. Returns the new state synchronously. */
  update(areas: readonly LearnerArea[], recipe: Recipe): LearnerState {
    const current = this.snapshot.state;
    if (!current) throw new Error('Learner state is not loaded yet');
    const next = recipe(current, this.clock());
    if (next === current) return current;
    this.set({ state: next });
    this.saving = this.saving
      .then(() => this.repo.save(next, areas))
      .then(() => {
        if (this.snapshot.saveError) this.set({ saveError: null });
      })
      .catch((err: unknown) => {
        console.error('Failed to save learner data', err);
        this.set({ saveError: 'Your latest progress could not be saved. It will be retried with your next change.' });
      });
    return next;
  }

  /** Waits for pending saves (used by tests and before export). */
  flush(): Promise<void> {
    return this.saving;
  }

  dismissNotice() {
    this.set({ notice: null });
  }

  async reset(fresh: LearnerState): Promise<void> {
    await this.saving;
    await this.repo.clear();
    this.set({ state: fresh, saveError: null });
  }
}
