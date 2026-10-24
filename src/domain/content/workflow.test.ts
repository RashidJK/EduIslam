import { describe, expect, it } from 'vitest';
import { availableTransitions, canCreate, canEdit } from './workflow';

const ctx = { userId: 'me', authorId: 'someone', updatedBy: 'someone' };
const labels = (...args: Parameters<typeof availableTransitions>) => availableTransitions(...args).map((t) => t.to);

describe('workflow mirror (server enforces the same rules)', () => {
  it('lets editors submit drafts and nothing else', () => {
    expect(labels('draft', ['editor'], ctx)).toEqual(['in_review']);
    expect(labels('in_review', ['editor'], ctx)).toEqual([]);
    expect(labels('approved', ['editor'], ctx)).toEqual([]);
  });

  it('lets reviewers approve or request changes, but never on their own work', () => {
    expect(labels('in_review', ['reviewer'], ctx)).toEqual(['approved', 'changes_requested']);
    expect(labels('in_review', ['reviewer'], { ...ctx, authorId: 'me' })).toEqual([]);
    expect(labels('in_review', ['admin'], { ...ctx, updatedBy: 'me' })).toEqual([]);
    // Anyone who edited at any point is excluded, not just the last editor.
    expect(labels('in_review', ['reviewer'], { ...ctx, editorIds: ['someone', 'me'] })).toEqual([]);
  });

  it('reserves publishing for publishers and admins', () => {
    expect(labels('approved', ['publisher'], ctx)).toEqual(['published', 'changes_requested']);
    expect(labels('approved', ['reviewer'], ctx)).toEqual(['changes_requested']);
    expect(labels('published', ['publisher'], ctx)).toEqual(['archived', 'draft']);
  });

  it('gives learners no actions', () => {
    for (const s of ['draft', 'in_review', 'approved', 'published', 'archived'] as const) expect(labels(s, [], ctx)).toEqual([]);
    expect(canCreate([])).toBe(false);
  });

  it('allows editing only drafts and items with requested changes', () => {
    expect(canEdit('draft', ['editor'])).toBe(true);
    expect(canEdit('changes_requested', ['admin'])).toBe(true);
    expect(canEdit('in_review', ['editor'])).toBe(false);
    expect(canEdit('published', ['admin'])).toBe(false);
    expect(canEdit('draft', ['reviewer'])).toBe(false);
  });
});
