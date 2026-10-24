import { brand } from '@/config/brand';
import type { LearnerState } from '@/domain/learner/schema';

/** Everything stored about the learner, as a downloadable JSON document. */
export function exportLearnerData(state: LearnerState, now: Date): { filename: string; json: string } {
  return {
    filename: `${brand.storagePrefix}-learning-data-${now.toISOString().slice(0, 10)}.json`,
    json: JSON.stringify({ exportedAt: now.toISOString(), app: brand.name, data: state }, null, 2),
  };
}
