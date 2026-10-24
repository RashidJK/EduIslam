import { describe, expect, it } from 'vitest';
import { evaluate, initialResponse, isResponseComplete, isScored, seededShuffle } from './evaluate';
import { QuestionSchema, type Question } from './schema';

const q = <T extends Question['type']>(raw: unknown) => QuestionSchema.parse(raw) as Extract<Question, { type: T }>;

const single = q<'single-choice'>({
  id: 'q1',
  type: 'single-choice',
  prompt: 'Which option is B?',
  explanation: 'B is the second option.',
  options: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  correctOptionId: 'b',
});

describe('evaluate', () => {
  it('marks single-choice answers and explains wrong ones', () => {
    expect(evaluate(single, { type: 'single-choice', optionId: 'b' })).toMatchObject({ correct: true, headline: 'Correct' });
    const wrong = evaluate(single, { type: 'single-choice', optionId: 'a' });
    expect(wrong.correct).toBe(false);
    expect(wrong.explanation).toBe('B is the second option.');
    expect(wrong.correctAnswer).toBe('B');
    // Feedback stays respectful: no punitive wording.
    expect(wrong.headline).not.toMatch(/wrong|fail/i);
  });

  it('requires the exact set for multi-select', () => {
    const multi = q<'multi-select'>({
      id: 'q2',
      type: 'multi-select',
      prompt: 'Pick the vowels',
      explanation: 'A and E are vowels.',
      options: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'e', label: 'E' },
      ],
      correctOptionIds: ['a', 'e'],
    });
    expect(evaluate(multi, { type: 'multi-select', optionIds: ['e', 'a'] }).correct).toBe(true);
    expect(evaluate(multi, { type: 'multi-select', optionIds: ['a'] }).correct).toBe(false);
    expect(evaluate(multi, { type: 'multi-select', optionIds: ['a', 'b', 'e'] }).correct).toBe(false);
  });

  it('checks every pair in match-pairs', () => {
    const match = q<'match-pairs'>({
      id: 'q3',
      type: 'match-pairs',
      prompt: 'Match',
      explanation: 'Each letter has one name.',
      pairs: [
        { id: 'p1', left: 'x', right: 'X' },
        { id: 'p2', left: 'y', right: 'Y' },
      ],
    });
    expect(evaluate(match, { type: 'match-pairs', matches: { p1: 'p1', p2: 'p2' } }).correct).toBe(true);
    expect(evaluate(match, { type: 'match-pairs', matches: { p1: 'p2', p2: 'p1' } }).correct).toBe(false);
    expect(isResponseComplete(match, { type: 'match-pairs', matches: { p1: 'p1' } })).toBe(false);
  });

  it('checks order for order-steps', () => {
    const order = q<'order-steps'>({
      id: 'q4',
      type: 'order-steps',
      prompt: 'Order',
      explanation: 'First, second, third.',
      items: [
        { id: '1', label: 'First' },
        { id: '2', label: 'Second' },
        { id: '3', label: 'Third' },
      ],
    });
    expect(evaluate(order, { type: 'order-steps', order: ['1', '2', '3'] }).correct).toBe(true);
    const wrong = evaluate(order, { type: 'order-steps', order: ['2', '1', '3'] });
    expect(wrong.correct).toBe(false);
    expect(wrong.correctAnswer).toContain('1. First');
  });

  it('does not score reflections or recall', () => {
    const reflection = q<'reflection'>({ id: 'r', type: 'reflection', prompt: 'Think about it' });
    const recall = q<'recall'>({ id: 'c', type: 'recall', prompt: 'Recall', answer: 'Answer' });
    expect(isScored(reflection)).toBe(false);
    expect(isScored(recall)).toBe(false);
    expect(evaluate(reflection, { type: 'reflection', text: '' }).correct).toBeNull();
    expect(evaluate(recall, { type: 'recall', selfAssessment: 'partly' }).correct).toBeNull();
  });

  it('rejects mismatched response types', () => {
    expect(() => evaluate(single, { type: 'multi-select', optionIds: [] })).toThrow();
  });
});

describe('seededShuffle', () => {
  it('is deterministic per seed and never returns the solved order', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(seededShuffle(items, 'x')).toEqual(seededShuffle(items, 'x'));
    for (const seed of ['a', 'b', 'c', 'q1', 'q2', 'lesson-1']) {
      const out = seededShuffle(items, seed);
      expect([...out].sort()).toEqual(items);
      expect(out).not.toEqual(items);
    }
  });
});

describe('initialResponse', () => {
  it('treats an empty reflection as complete, since reflections are optional', () => {
    const reflection = q<'reflection'>({ id: 'r', type: 'reflection', prompt: 'Think' });
    expect(isResponseComplete(reflection, initialResponse(reflection))).toBe(true);
  });

  it('starts ordering questions shuffled and leaves choice questions unanswered', () => {
    const order = q<'order-steps'>({ id: 'o', type: 'order-steps', prompt: 'p', explanation: 'e', items: [{ id: '1', label: 'a' }, { id: '2', label: 'b' }, { id: '3', label: 'c' }] });
    const r = initialResponse(order);
    expect(r?.type).toBe('order-steps');
    expect(isResponseComplete(order, r)).toBe(true);
    expect(initialResponse(single)).toBeUndefined();
  });
});
