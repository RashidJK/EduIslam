// Device-only persistence in localStorage. Data never leaves the browser.
import { brand } from '@/config/brand';
import { createInitialLearnerState, LearnerStateSchema, type LearnerState } from '@/domain/learner/schema';
import { detectTimeZone, type Clock } from '@/domain/time';
import type { LearnerRepository, LoadResult } from './repository';

export const LEARNER_STORAGE_KEY = `${brand.storagePrefix}.learner.v1`;

/** Each signed-in account gets its own offline cache, separate from device-only data. */
export function accountCacheKey(userId: string): string {
  return `${LEARNER_STORAGE_KEY}.account.${userId}`;
}

/** Removes an account's offline cache, e.g. on sign-out on a shared device. */
export function clearAccountCache(userId: string): void {
  try {
    window.localStorage.removeItem(accountCacheKey(userId));
  } catch {
    // Storage unavailable: nothing was cached.
  }
}

function getStorage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = `${brand.storagePrefix}.probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function createLocalLearnerRepository(clock: Clock, storage: Storage | null = getStorage(), key: string = LEARNER_STORAGE_KEY): LearnerRepository {
  // Falls back to memory when storage is unavailable (e.g. some private browsing modes).
  let memory: string | null = null;

  const read = () => (storage ? storage.getItem(key) : memory);
  const write = (value: string) => {
    if (storage) storage.setItem(key, value);
    else memory = value;
  };

  return {
    kind: storage ? 'local' : 'memory',
    description: storage
      ? 'Saved in this browser on this device only. Clearing site data removes it.'
      : 'Your browser is blocking storage, so progress is kept only until you close this tab.',

    async load(): Promise<LoadResult> {
      const fresh = createInitialLearnerState(clock(), detectTimeZone());
      const raw = read();
      if (!raw) {
        return storage ? { state: fresh, isNew: true } : { state: fresh, isNew: true, notice: 'Your browser is blocking storage, so progress will not be kept after you close this tab.' };
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = undefined;
      }
      const result = LearnerStateSchema.safeParse(parsed);
      if (result.success) return { state: result.data };
      // Keep the unreadable data so nothing is silently destroyed.
      const backupKey = `${key}.unreadable.${clock().getTime()}`;
      try {
        storage?.setItem(backupKey, raw);
      } catch {
        // Ignore: storage may be full.
      }
      return {
        state: fresh,
        notice: "We couldn't read the progress saved on this device, so we started fresh. A copy of the old data was kept in this browser.",
      };
    },

    async save(state: LearnerState) {
      write(JSON.stringify(state));
    },

    async clear() {
      if (storage) storage.removeItem(key);
      memory = null;
    },
  };
}
