// Account-backed learner persistence. The row is protected by RLS (owner only). Each account
// has its own offline cache on the device (never shared with another account or with
// device-only data), cleared on sign-out.
import { LEARNER_SCHEMA_VERSION, LearnerStateSchema, type LearnerState } from '@/domain/learner/schema';
import type { LearnerRepository, LoadResult } from '../learner/repository';

/** The small slice of the Supabase client this repository needs (easy to fake in tests). */
export interface LearnerStateTable {
  fetch(userId: string): Promise<{ data: { data: unknown } | null; error: { message: string } | null }>;
  upsert(row: { user_id: string; schema_version: number; data: LearnerState; updated_at: string }): Promise<{ error: { message: string } | null }>;
  remove(userId: string): Promise<{ error: { message: string } | null }>;
}

export function createAccountLearnerRepository(opts: {
  userId: string;
  table: LearnerStateTable;
  /** This account's own offline cache. */
  cache: LearnerRepository;
  /** Device-only (guest) progress, offered to the account on its first sign-in. */
  device: LearnerRepository;
}): LearnerRepository {
  const { userId, table, cache, device } = opts;
  const upsert = (state: LearnerState) => table.upsert({ user_id: userId, schema_version: LEARNER_SCHEMA_VERSION, data: state, updated_at: new Date().toISOString() });

  return {
    kind: 'supabase',
    description: 'Saved to your account so it follows you across devices. While signed in, a copy is kept on this device for offline use; it is removed when you sign out.',

    async load(): Promise<LoadResult> {
      let remote: Awaited<ReturnType<LearnerStateTable['fetch']>>;
      try {
        remote = await table.fetch(userId);
      } catch {
        remote = { data: null, error: { message: 'network' } };
      }
      if (remote.error) {
        const cached = await cache.load();
        return {
          state: cached.state,
          notice: cached.isNew
            ? 'Your account couldn’t be reached. You can keep learning; your progress will be saved to your account when you reconnect.'
            : 'Your account couldn’t be reached, so you’re seeing the progress saved on this device. Changes will sync when you reconnect.',
        };
      }
      if (!remote.data) {
        // First sign-in for this account: carry this device's guest progress into it.
        const guest = await device.load();
        await cache.save(guest.state, []);
        const { error } = await upsert(guest.state);
        if (error) return { state: guest.state, notice: 'Your progress couldn’t be saved to your account yet. It is still on this device.' };
        return guest.isNew ? { state: guest.state } : { state: guest.state, notice: 'Your progress on this device is now saved to your account.' };
      }
      const parsed = LearnerStateSchema.safeParse(remote.data.data);
      if (!parsed.success) {
        const cached = await cache.load();
        return { state: cached.state, notice: 'The progress saved in your account couldn’t be read. Nothing was overwritten.' };
      }
      await cache.save(parsed.data, []);
      return { state: parsed.data };
    },

    async save(state, areas) {
      await cache.save(state, areas);
      const { error } = await upsert(state);
      if (error) throw new Error(error.message);
    },

    async clear() {
      await cache.clear();
      const { error } = await table.remove(userId);
      if (error) throw new Error(error.message);
    },
  };
}
