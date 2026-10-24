import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderApp, seedOnboarded } from '@/test/renderApp';
import type { AccountApi } from '@/app/account';
import { availableTransitions, canCreate, canEdit, type AppRole } from '@/domain/content/workflow';
import type { PublicationStatus } from '@/domain/content/schema';
import type { AdminApi } from '@/data/supabase/adminApi';
import type { ContentRow } from '@/data/supabase/contentRows';
import { FIXTURE_SOURCE } from '@/test/fixtures/content';

/** In-memory CMS that applies the same rules as the database (which tests/db verifies). */
class FakeCms {
  rows: ContentRow[] = [];
  users: Record<string, { roles: AppRole[]; name: string }> = {};
  asUser(id: string): AdminApi {
    const roles = () => this.users[id]?.roles ?? [];
    const find = (rowId: string) => {
      const r = this.rows.find((x) => x.id === rowId);
      if (!r) throw new Error('Content not found');
      return r;
    };
    return {
      listItems: async () => (roles().length ? [...this.rows] : this.rows.filter((r) => r.status === 'published')),
      createDraft: async (input) => {
        if (!canCreate(roles())) throw new Error('new row violates row-level security policy');
        const row: ContentRow = {
          id: `00000000-0000-4000-8000-${String(this.rows.length + 1).padStart(12, '0')}`,
          content_type: input.contentType,
          slug: input.slug,
          title: input.title,
          language: 'en',
          content_class: input.contentClass,
          status: 'draft',
          payload: input.payload,
          version: 1,
          author_id: id,
          updated_by: id,
          reviewer_name: null,
          reviewed_at: null,
          review_notes: null,
          published_at: null,
          updated_at: new Date().toISOString(),
        };
        this.rows.push(row);
        return row;
      },
      updateDraft: async (rowId, patch) => {
        const r = find(rowId);
        if (!canEdit(r.status, roles())) throw new Error('This item can’t be edited in its current status, or your role doesn’t allow it.');
        Object.assign(r, { ...patch.payload && { payload: patch.payload }, ...patch.title && { title: patch.title }, version: r.version + 1, updated_by: id });
        return { ...r };
      },
      transition: async (rowId, to: PublicationStatus, notes) => {
        const r = find(rowId);
        const ok = availableTransitions(r.status, roles(), { userId: id, authorId: r.author_id, updatedBy: r.updated_by }).some((t) => t.to === to);
        if (!ok) throw new Error(`Your role does not allow moving content from ${r.status} to ${to}`);
        if (to === 'approved') Object.assign(r, { reviewer_name: this.users[id]!.name, reviewed_at: new Date().toISOString() });
        Object.assign(r, { status: to, review_notes: notes ?? r.review_notes });
        return { ...r };
      },
      listVersions: async () => [],
      listReviews: async () => [],
      listAudit: async () => [],
      listRoles: async () => Object.entries(this.users).flatMap(([user_id, u]) => u.roles.map((role) => ({ user_id, role }))),
      setRole: async () => {},
    };
  }
}

function accountFor(cms: FakeCms, id: string | null): AccountApi {
  const roles = id ? (cms.users[id]?.roles ?? []) : [];
  return {
    account: id ? { status: 'signed-in', user: { id, email: `${id}@example.test` }, roles } : { status: 'signed-out', user: null, roles: [] },
    signInWithEmail: async () => ({ error: null }),
    signOut: async () => {},
    deleteAccount: async () => ({ error: null }),
    adminApi: id ? cms.asUser(id) : null,
  };
}

const VALID_PAYLOAD = {
  summary: 'Placeholder used by automated tests.',
  arabic: 'ا ب ت',
  translation: 'TEST FIXTURE — placeholder translation',
  usage: 'TEST FIXTURE — placeholder usage',
  categories: ['everyday'],
  sources: [FIXTURE_SOURCE],
};

describe('content admin', () => {
  it('explains that a backend is needed when none is configured', async () => {
    seedOnboarded();
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: /needs a backend/i })).toBeInTheDocument();
    expect(screen.getByText(/enforced by the database/i)).toBeInTheDocument();
  });

  it('turns away signed-out users and accounts without a role', async () => {
    const cms = new FakeCms();
    seedOnboarded();
    const first = renderApp('/admin', { account: accountFor(cms, null) });
    expect(await screen.findByRole('heading', { name: /sign in to continue/i })).toBeInTheDocument();
    first.unmount();
    renderApp('/admin', { account: accountFor(cms, 'learner') });
    expect(await screen.findByRole('heading', { name: /don’t have a content role/i })).toBeInTheDocument();
  });

  it('runs draft → review → approval → publication across three people', async () => {
    const cms = new FakeCms();
    cms.users = { editor: { roles: ['editor'], name: 'Ed' }, reviewer: { roles: ['reviewer'], name: 'Rev' }, publisher: { roles: ['publisher'], name: 'Pub' } };
    seedOnboarded();

    // Editor drafts from an empty template and sees what is missing.
    const ed = renderApp('/admin', { account: accountFor(cms, 'editor') });
    await ed.user.click(await screen.findByRole('button', { name: /new draft/i }));
    await ed.user.type(screen.getByLabelText(/^title$/i), 'Test dua');
    await ed.user.type(screen.getByLabelText(/^slug/i), 'test-dua');
    expect(await screen.findByText(/fix before publishing/i)).toBeInTheDocument();
    expect(screen.getByText(/needs at least one source/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/content fields/i), { target: { value: JSON.stringify(VALID_PAYLOAD) } });
    expect(await screen.findByText(/content structure is valid/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /preview — as learners will see it/i })).toBeInTheDocument();
    await ed.user.click(screen.getByRole('button', { name: /create draft/i }));
    expect(await screen.findByText(/draft created/i)).toBeInTheDocument();
    await ed.user.click(screen.getByRole('button', { name: /submit for review/i }));
    await waitFor(() => expect(cms.rows[0]!.status).toBe('in_review'));
    // The editor cannot approve.
    expect(await screen.findByText(/no workflow actions are available/i)).toBeInTheDocument();
    ed.unmount();

    // Reviewer approves with notes.
    const rev = renderApp('/admin', { account: accountFor(cms, 'reviewer') });
    await rev.user.click(await screen.findByRole('button', { name: /test dua/i }));
    expect(screen.getByLabelText(/^title$/i)).toBeDisabled();
    await rev.user.type(screen.getByLabelText(/review notes/i), 'Checked against the source');
    await rev.user.click(screen.getByRole('button', { name: /^approve$/i }));
    await waitFor(() => expect(cms.rows[0]!.status).toBe('approved'));
    rev.unmount();

    // Publisher publishes.
    const pub = renderApp('/admin', { account: accountFor(cms, 'publisher') });
    await pub.user.click(await screen.findByRole('button', { name: /test dua/i }));
    await pub.user.click(screen.getByRole('button', { name: /^publish$/i }));
    await waitFor(() => expect(cms.rows[0]!.status).toBe('published'));
    const list = screen.getByRole('list', { name: /content items/i });
    expect(within(list).getByText(/dua · published · v1/i)).toBeInTheDocument();
  });

  it('does not offer review actions on your own work', async () => {
    const cms = new FakeCms();
    cms.users = { admin: { roles: ['admin'], name: 'Ad' } };
    seedOnboarded();
    const { user } = renderApp('/admin', { account: accountFor(cms, 'admin') });
    await user.click(await screen.findByRole('button', { name: /new draft/i }));
    await user.type(screen.getByLabelText(/^title$/i), 'Own work');
    await user.type(screen.getByLabelText(/^slug/i), 'own-work');
    fireEvent.change(screen.getByLabelText(/content fields/i), { target: { value: JSON.stringify(VALID_PAYLOAD) } });
    await user.click(screen.getByRole('button', { name: /create draft/i }));
    await user.click(await screen.findByRole('button', { name: /submit for review/i }));
    await waitFor(() => expect(cms.rows[0]!.status).toBe('in_review'));
    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /roles/i })).toBeInTheDocument();
  });
});
