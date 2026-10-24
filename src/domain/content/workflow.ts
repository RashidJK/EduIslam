// The content review workflow. The database enforces these rules in
// transition_content() (supabase/migrations); this mirror only decides which actions the
// admin UI offers. Keep the two in sync — tests/db/rls.test.ts covers the server side.
import type { PublicationStatus } from './schema';

export const APP_ROLES = ['admin', 'editor', 'reviewer', 'publisher'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  reviewer: 'Reviewer',
  publisher: 'Publisher',
};

export interface TransitionRule {
  from: readonly PublicationStatus[];
  to: PublicationStatus;
  roles: readonly AppRole[];
  label: string;
  /** Reviewers may not act on content they wrote or ever edited. */
  notOwnWork?: boolean;
  needsNotes?: boolean;
}

export const TRANSITIONS: readonly TransitionRule[] = [
  { from: ['draft', 'changes_requested'], to: 'in_review', roles: ['editor', 'admin'], label: 'Submit for review' },
  { from: ['changes_requested'], to: 'draft', roles: ['editor', 'admin'], label: 'Return to draft' },
  { from: ['in_review'], to: 'approved', roles: ['reviewer', 'admin'], label: 'Approve', notOwnWork: true },
  { from: ['in_review'], to: 'changes_requested', roles: ['reviewer', 'admin'], label: 'Request changes', notOwnWork: true, needsNotes: true },
  { from: ['approved'], to: 'published', roles: ['publisher', 'admin'], label: 'Publish' },
  { from: ['approved'], to: 'changes_requested', roles: ['reviewer', 'publisher', 'admin'], label: 'Send back for changes', needsNotes: true },
  { from: ['published'], to: 'archived', roles: ['publisher', 'admin'], label: 'Archive' },
  { from: ['published'], to: 'draft', roles: ['publisher', 'admin'], label: 'Unpublish to draft' },
  { from: ['archived'], to: 'draft', roles: ['editor', 'admin'], label: 'Restore to draft' },
];

export function availableTransitions(
  status: PublicationStatus,
  roles: readonly AppRole[],
  ctx: { userId: string; authorId: string | null; updatedBy: string | null; editorIds?: readonly string[] },
): TransitionRule[] {
  const ownWork = ctx.authorId === ctx.userId || ctx.updatedBy === ctx.userId || Boolean(ctx.editorIds?.includes(ctx.userId));
  return TRANSITIONS.filter((t) => t.from.includes(status) && t.roles.some((r) => roles.includes(r)) && !(t.notOwnWork && ownWork));
}

export function canEdit(status: PublicationStatus, roles: readonly AppRole[]): boolean {
  return (status === 'draft' || status === 'changes_requested') && (roles.includes('editor') || roles.includes('admin'));
}

export function canCreate(roles: readonly AppRole[]): boolean {
  return roles.includes('editor') || roles.includes('admin');
}
