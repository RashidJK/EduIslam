// Shared content model. Every learner-facing item carries publication status, review
// metadata, and sources. The publishing gate (`isLearnerVisible`) is the single place that
// decides whether something can be shown to ordinary learners.
import { z } from 'zod';

export const PUBLICATION_STATUSES = ['draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived'] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<PublicationStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
};

/**
 * - `religious`: makes religious claims (rulings, narrations, duas, history). Needs sources
 *   and a named reviewer before it can be published.
 * - `linguistic`: language material (e.g. Arabic letters) with no religious claims.
 * - `app-guide`: explains how this app works.
 * - `sample`: demonstration content, always shown with a visible notice.
 */
export const CONTENT_CLASSES = ['religious', 'linguistic', 'app-guide', 'sample'] as const;
export type ContentClass = (typeof CONTENT_CLASSES)[number];

export const SourceRefSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['quran', 'hadith', 'book', 'website', 'scholar', 'other']),
  title: z.string().min(1),
  author: z.string().optional(),
  collection: z.string().optional(),
  locator: z.string().optional(),
  url: z.url().optional(),
  grading: z.object({ grade: z.string().min(1), gradedBy: z.string().min(1) }).optional(),
  notes: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const ReviewMetaSchema = z.object({
  reviewer: z.string().min(1).nullable(),
  reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  notes: z.string().optional(),
  version: z.number().int().min(1),
});
export type ReviewMeta = z.infer<typeof ReviewMetaSchema>;

export const ContentBaseSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  summary: z.string(),
  language: z.enum(['en']),
  status: z.enum(PUBLICATION_STATUSES),
  contentClass: z.enum(CONTENT_CLASSES),
  sources: z.array(SourceRefSchema),
  review: ReviewMetaSchema,
  /** Shown prominently on sample or provisional content. */
  notice: z.string().optional(),
  /** Editorial notes about what must be verified before publishing. Admin-only. */
  editorialNotes: z.string().optional(),
});
export type ContentBase = z.infer<typeof ContentBaseSchema>;

export interface PublishingProblem {
  field: string;
  message: string;
}

/** Requirements an item must meet before it may be published. Pure and shared by UI, tests, and CMS. */
export function publishingProblems(item: Pick<ContentBase, 'contentClass' | 'sources' | 'review' | 'notice'>): PublishingProblem[] {
  const problems: PublishingProblem[] = [];
  if (item.contentClass === 'religious') {
    if (item.sources.length === 0) problems.push({ field: 'sources', message: 'Religious content needs at least one source.' });
    if (!item.review.reviewer) problems.push({ field: 'review.reviewer', message: 'A named reviewer must approve religious content.' });
    if (!item.review.reviewedOn) problems.push({ field: 'review.reviewedOn', message: 'Record the review date.' });
  }
  if (item.contentClass === 'sample' && !item.notice) {
    problems.push({ field: 'notice', message: 'Sample content must carry a visible notice.' });
  }
  return problems;
}

export function isLearnerVisible(item: Pick<ContentBase, 'status' | 'contentClass' | 'sources' | 'review' | 'notice'>): boolean {
  return item.status === 'published' && publishingProblems(item).length === 0;
}

/** Zod refinement that rejects items marked published without meeting the requirements. */
export function refinePublishable<T extends ContentBase>(item: T, ctx: z.RefinementCtx): void {
  if (item.status !== 'published') return;
  for (const p of publishingProblems(item)) {
    ctx.addIssue({ code: 'custom', path: p.field.split('.'), message: `Cannot publish "${item.id}": ${p.message}` });
  }
}
