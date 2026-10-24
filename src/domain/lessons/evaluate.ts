// Pure answer evaluation for every question type. Feedback always explains the answer;
// unscored types (reflection, recall) return `correct: null`.
import type { Question } from './schema';

export type QuestionResponse =
  | { type: 'single-choice' | 'fill-blank' | 'listen-select'; optionId: string }
  | { type: 'multi-select'; optionIds: string[] }
  /** Map of left-item id -> chosen right-item id. */
  | { type: 'match-pairs'; matches: Record<string, string> }
  /** Item ids in the order the learner arranged them. */
  | { type: 'order-steps'; order: string[] }
  | { type: 'reflection'; text: string }
  | { type: 'recall'; selfAssessment: 'recalled' | 'partly' | 'not-yet' };

export interface Evaluation {
  /** `null` for unscored questions. */
  correct: boolean | null;
  headline: string;
  explanation: string;
  /** Human-readable correct answer, shown when the learner's answer differs. */
  correctAnswer?: string;
}

export function isScored(question: Question): boolean {
  return question.type !== 'reflection' && question.type !== 'recall';
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

function optionLabel(question: Extract<Question, { options: unknown }>, id: string): string {
  const o = question.options.find((opt) => opt.id === id);
  return o ? (o.arabic ? `${o.arabic} — ${o.label}` : o.label) : id;
}

function scored(correct: boolean, explanation: string, correctAnswer?: string): Evaluation {
  return correct
    ? { correct, headline: 'Correct', explanation }
    : { correct, headline: 'Not quite — here is why', explanation, correctAnswer };
}

export function evaluate(question: Question, response: QuestionResponse): Evaluation {
  if (response.type !== question.type) {
    throw new Error(`Response type "${response.type}" does not match question type "${question.type}"`);
  }

  switch (question.type) {
    case 'single-choice':
    case 'fill-blank':
    case 'listen-select': {
      const r = response as Extract<QuestionResponse, { optionId: string }>;
      return scored(r.optionId === question.correctOptionId, question.explanation, optionLabel(question, question.correctOptionId));
    }
    case 'multi-select': {
      const r = response as Extract<QuestionResponse, { type: 'multi-select' }>;
      return scored(
        sameSet(r.optionIds, question.correctOptionIds),
        question.explanation,
        question.correctOptionIds.map((id) => optionLabel(question, id)).join(', '),
      );
    }
    case 'match-pairs': {
      const r = response as Extract<QuestionResponse, { type: 'match-pairs' }>;
      // A pair is matched correctly when the learner links its left side to its own right side.
      const allRight = question.pairs.every((p) => r.matches[p.id] === p.id);
      return scored(allRight, question.explanation, question.pairs.map((p) => `${p.left} → ${p.right}`).join('; '));
    }
    case 'order-steps': {
      const r = response as Extract<QuestionResponse, { type: 'order-steps' }>;
      const expected = question.items.map((i) => i.id);
      const correct = r.order.length === expected.length && r.order.every((id, i) => id === expected[i]);
      return scored(correct, question.explanation, question.items.map((i, n) => `${n + 1}. ${i.label}`).join('  '));
    }
    case 'reflection':
      return { correct: null, headline: 'Thank you for reflecting', explanation: 'Reflections are private and are not scored.' };
    case 'recall': {
      const r = response as Extract<QuestionResponse, { type: 'recall' }>;
      const headline = r.selfAssessment === 'recalled' ? 'Well recalled' : r.selfAssessment === 'partly' ? 'Partly recalled' : 'Keep practising';
      return { correct: null, headline, explanation: 'Recall practice is self-assessed. It will come back for revision.' };
    }
  }
}

/** Whether the response contains enough input to be checked. */
export function isResponseComplete(question: Question, response: QuestionResponse | undefined): boolean {
  if (!response) return false;
  switch (response.type) {
    case 'single-choice':
    case 'fill-blank':
    case 'listen-select':
      return Boolean(response.optionId);
    case 'multi-select':
      return response.optionIds.length > 0;
    case 'match-pairs':
      return question.type === 'match-pairs' && question.pairs.every((p) => Boolean(response.matches[p.id]));
    case 'order-steps':
      return question.type === 'order-steps' && response.order.length === question.items.length;
    case 'reflection':
      return true;
    case 'recall':
      return Boolean(response.selfAssessment);
  }
}

/**
 * The starting response for questions that begin with a state: ordering starts shuffled,
 * and reflections are optional, so an empty reflection is already complete.
 */
export function initialResponse(question: Question): QuestionResponse | undefined {
  if (question.type === 'order-steps') return { type: 'order-steps', order: seededShuffle(question.items, question.id).map((i) => i.id) };
  if (question.type === 'reflection') return { type: 'reflection', text: '' };
  return undefined;
}

/** Deterministic shuffle so a lesson renders the same order on every visit (seeded by question id). */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  // Avoid presenting an "ordering" exercise already solved.
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift() as T);
  return out;
}
