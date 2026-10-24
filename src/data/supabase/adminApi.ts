// CMS operations for staff. Every call goes through RLS and the workflow function in the
// database; this module only shapes requests and responses.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContentClass, PublicationStatus } from '@/domain/content/schema';
import type { AppRole } from '@/domain/content/workflow';
import { ContentRowSchema, type ContentRow, type ContentType } from './contentRows';

export interface DraftInput {
  contentType: ContentType;
  slug: string;
  title: string;
  contentClass: ContentClass;
  payload: Record<string, unknown>;
}

export interface VersionEntry {
  version: number;
  kind: 'create' | 'edit' | 'status';
  status: PublicationStatus;
  title: string;
  edited_by: string | null;
  created_at: string;
}

export interface ReviewEntry {
  version: number;
  decision: 'approved' | 'changes_requested';
  notes: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminApi {
  listItems(): Promise<ContentRow[]>;
  createDraft(input: DraftInput): Promise<ContentRow>;
  updateDraft(id: string, patch: Partial<Omit<DraftInput, 'contentType'>>): Promise<ContentRow>;
  transition(id: string, to: PublicationStatus, notes?: string): Promise<ContentRow>;
  listVersions(id: string): Promise<VersionEntry[]>;
  listReviews(id: string): Promise<ReviewEntry[]>;
  listAudit(limit?: number): Promise<AuditEntry[]>;
  listRoles(): Promise<{ user_id: string; role: AppRole }[]>;
  setRole(userId: string, role: AppRole, grant: boolean): Promise<void>;
}

/** Turns database errors into messages staff can act on. */
export function adminErrorMessage(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? String(err);
  if (/row-level security|permission denied/i.test(msg)) return 'Your role doesn’t allow this action.';
  if (/duplicate key/i.test(msg)) return 'Another item of this type already uses that slug.';
  return msg.replace(/^.*?ERROR:\s*/, '');
}

function parseRow(data: unknown): ContentRow {
  return ContentRowSchema.parse(data);
}

export function createSupabaseAdminApi(client: SupabaseClient): AdminApi {
  const fail = (error: { message: string } | null) => {
    if (error) throw new Error(adminErrorMessage(error));
  };
  return {
    async listItems() {
      const { data, error } = await client.from('content_items').select('*').order('updated_at', { ascending: false });
      fail(error);
      return (data ?? []).map(parseRow);
    },
    async createDraft(input) {
      const { data, error } = await client
        .from('content_items')
        .insert({ content_type: input.contentType, slug: input.slug, title: input.title, content_class: input.contentClass, payload: input.payload })
        .select('*')
        .single();
      fail(error);
      return parseRow(data);
    },
    async updateDraft(id, patch) {
      const update: Record<string, unknown> = {};
      if (patch.slug !== undefined) update.slug = patch.slug;
      if (patch.title !== undefined) update.title = patch.title;
      if (patch.contentClass !== undefined) update.content_class = patch.contentClass;
      if (patch.payload !== undefined) update.payload = patch.payload;
      const { data, error } = await client.from('content_items').update(update).eq('id', id).select('*').maybeSingle();
      fail(error);
      if (!data) throw new Error('This item can’t be edited in its current status, or your role doesn’t allow it.');
      return parseRow(data);
    },
    async transition(id, to, notes) {
      const { data, error } = await client.rpc('transition_content', { item_id: id, to_status: to, notes: notes ?? null });
      fail(error);
      return parseRow(data);
    },
    async listVersions(id) {
      const { data, error } = await client.from('content_versions').select('version,kind,status,title,edited_by,created_at').eq('content_id', id).order('id', { ascending: false });
      fail(error);
      return (data ?? []) as VersionEntry[];
    },
    async listReviews(id) {
      const { data, error } = await client.from('content_reviews').select('version,decision,notes,created_at').eq('content_id', id).order('id', { ascending: false });
      fail(error);
      return (data ?? []) as ReviewEntry[];
    },
    async listAudit(limit = 100) {
      const { data, error } = await client.from('admin_audit_log').select('*').order('id', { ascending: false }).limit(limit);
      fail(error);
      return (data ?? []) as AuditEntry[];
    },
    async listRoles() {
      const { data, error } = await client.from('user_roles').select('user_id,role').order('user_id');
      fail(error);
      return (data ?? []) as { user_id: string; role: AppRole }[];
    },
    async setRole(userId, role, grant) {
      const { error } = await client.rpc('set_user_role', { target: userId, r: role, grant_role: grant });
      fail(error);
    },
  };
}
