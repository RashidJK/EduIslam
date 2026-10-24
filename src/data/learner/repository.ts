import type { LearnerState } from '@/domain/learner/schema';

/** Which part of the learner state changed, so remote adapters can write only what is needed. */
export type LearnerArea =
  | 'profile'
  | 'preferences'
  | 'lessons'
  | 'reading'
  | 'bookmarks'
  | 'memorization'
  | 'duas'
  | 'favorites'
  | 'listening'
  | 'activity'
  | 'plans'
  | 'stories'
  | 'salah';

export interface LoadResult {
  state: LearnerState;
  /** A message for the learner when something unusual happened while loading. */
  notice?: string;
  /** True when nothing was stored yet and `state` is a fresh default. */
  isNew?: boolean;
}

export interface LearnerRepository {
  readonly kind: 'local' | 'memory' | 'supabase';
  /** Human-readable description of where data is stored, shown in Settings. */
  readonly description: string;
  load(): Promise<LoadResult>;
  save(state: LearnerState, areas: readonly LearnerArea[]): Promise<void>;
  clear(): Promise<void>;
}
