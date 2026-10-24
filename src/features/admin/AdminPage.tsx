import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Plus, ShieldCheck } from 'lucide-react';
import { PUBLICATION_STATUSES, STATUS_LABELS, type PublicationStatus } from '@/domain/content/schema';
import { APP_ROLES, ROLE_LABELS, canCreate, type AppRole } from '@/domain/content/workflow';
import { adminErrorMessage, type AdminApi } from '@/data/supabase/adminApi';
import { CONTENT_TYPE_LABELS, CONTENT_TYPES, type ContentRow, type ContentType } from '@/data/supabase/contentRows';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { FieldLabel, Select, TextInput } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAccount } from '@/app/account';
import { ContentEditor } from './ContentEditor';

export function AdminPage() {
  const { account, adminApi } = useAccount();
  if (account.status === 'unconfigured') {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Content admin" />
        <EmptyState icon={<Lock aria-hidden className="size-6" />} title="The content admin needs a backend">
          Accounts and the review workflow run on Supabase, where roles and publishing rules are enforced by the database — not by this screen. Set{' '}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> and apply the migrations in <code>supabase/migrations</code> (see the README).
        </EmptyState>
      </div>
    );
  }
  if (account.status !== 'signed-in' || !account.user) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Content admin" />
        <EmptyState icon={<Lock aria-hidden className="size-6" />} title="Sign in to continue" action={<Link to="/settings#account" className="font-medium text-primary underline">Sign in</Link>}>
          The content admin is for editors, reviewers, and publishers.
        </EmptyState>
      </div>
    );
  }
  if (account.roles.length === 0 || !adminApi) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Content admin" />
        <EmptyState icon={<Lock aria-hidden className="size-6" />} title="You don’t have a content role">
          Ask an admin to give your account a role. Your account ID is shown in Settings.
        </EmptyState>
      </div>
    );
  }
  return <Cms api={adminApi} userId={account.user.id} roles={account.roles} />;
}

function Cms({ api, userId, roles }: { api: AdminApi; userId: string; roles: AppRole[] }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'content' | 'roles' | 'activity'>('content');
  const [selected, setSelected] = useState<string | 'new' | null>(null);
  const [status, setStatus] = useState<PublicationStatus | ''>('');
  const [type, setType] = useState<ContentType | ''>('');
  const [query, setQuery] = useState('');
  const items = useQuery({ queryKey: ['admin', 'items'], queryFn: () => api.listItems() });
  const isAdmin = roles.includes('admin');

  const filtered = useMemo(
    () =>
      (items.data ?? []).filter(
        (r) => (!status || r.status === status) && (!type || r.content_type === type) && (!query || `${r.title} ${r.slug}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [items.data, status, type, query],
  );
  const current = selected && selected !== 'new' ? items.data?.find((r) => r.id === selected) ?? null : null;
  const counts = useMemo(() => Object.fromEntries(PUBLICATION_STATUSES.map((s) => [s, (items.data ?? []).filter((r) => r.status === s).length])), [items.data]);

  const [flash, setFlash] = useState<string | null>(null);
  const onSaved = (row: ContentRow, message: string) => {
    qc.setQueryData<ContentRow[]>(['admin', 'items'], (old) => [row, ...(old ?? []).filter((r) => r.id !== row.id)]);
    setSelected(row.id);
    setFlash(message);
  };

  return (
    <div>
      <PageHeader
        title="Content admin"
        description="Draft, review, and publish content. Every action is checked by the server."
        actions={
          <span className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <Badge key={r} tone="primary" icon={<ShieldCheck aria-hidden className="size-3.5" />}>
                {ROLE_LABELS[r]}
              </Badge>
            ))}
          </span>
        }
      />
      <div role="tablist" aria-label="Admin sections" className="mb-6 flex gap-2">
        {(isAdmin ? (['content', 'roles', 'activity'] as const) : (['content'] as const)).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn('min-h-10 rounded-xl px-4 text-sm font-medium', tab === t ? 'bg-primary text-on-primary' : 'border border-line bg-surface hover:bg-surface-2')}
          >
            {t === 'content' ? 'Content' : t === 'roles' ? 'Roles' : 'Activity'}
          </button>
        ))}
      </div>

      {tab === 'content' && (
        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className={cn('space-y-3', selected && 'hidden lg:block')}>
            {canCreate(roles) && (
              <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => {
                  setSelected('new');
                  setFlash(null);
                }} className="w-full">
                New draft
              </Button>
            )}
            <label htmlFor="admin-search" className="sr-only">
              Search content
            </label>
            <TextInput id="admin-search" type="search" placeholder="Search title or slug" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="admin-status" className="sr-only">
                  Filter by status
                </label>
                <Select id="admin-status" value={status} onChange={(e) => setStatus(e.target.value as PublicationStatus | '')}>
                  <option value="">All statuses</option>
                  {PUBLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]} ({counts[s] ?? 0})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="admin-type" className="sr-only">
                  Filter by type
                </label>
                <Select id="admin-type" value={type} onChange={(e) => setType(e.target.value as ContentType | '')}>
                  <option value="">All types</option>
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CONTENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {items.isLoading && <LoadingState />}
            {items.isError && <ErrorState message={adminErrorMessage(items.error)} onRetry={() => items.refetch()} />}
            {items.data && filtered.length === 0 && <p className="text-sm text-muted">No content matches these filters.</p>}
            <ul className="space-y-1.5" aria-label="Content items">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(r.id);
                      setFlash(null);
                    }}
                    aria-current={selected === r.id ? 'true' : undefined}
                    className={cn('w-full rounded-xl border p-3 text-left', selected === r.id ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-line-strong')}
                  >
                    <span className="block font-medium">{r.title}</span>
                    <span className="block text-xs text-muted">
                      {CONTENT_TYPE_LABELS[r.content_type]} · {STATUS_LABELS[r.status]} · v{r.version}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className={cn(!selected && 'hidden lg:block')}>
            {selected ? (
              <>
                <Button variant="ghost" size="sm" className="mb-3 lg:hidden" onClick={() => setSelected(null)}>
                  Back to list
                </Button>
                {flash && (
                  <Notice tone="success" className="mb-4" live onDismiss={() => setFlash(null)}>
                    {flash}
                  </Notice>
                )}
                <ContentEditor key={`${selected}-${current?.version ?? 0}-${current?.status ?? ''}`} api={api} row={current} userId={userId} roles={roles} onSaved={onSaved} />
              </>
            ) : (
              <Card className="text-muted">Choose an item to review or edit it.</Card>
            )}
          </div>
        </div>
      )}

      {tab === 'roles' && isAdmin && <RolesPanel api={api} userId={userId} />}
      {tab === 'activity' && isAdmin && <ActivityPanel api={api} />}
    </div>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function RolesPanel({ api, userId }: { api: AdminApi; userId: string }) {
  const roles = useQuery({ queryKey: ['admin', 'roles'], queryFn: () => api.listRoles() });
  const [target, setTarget] = useState('');
  const [role, setRole] = useState<AppRole>('editor');
  const [error, setError] = useState<string | null>(null);
  const change = async (id: string, r: AppRole, grant: boolean) => {
    setError(null);
    try {
      await api.setRole(id, r, grant);
      await roles.refetch();
      if (grant) setTarget('');
    } catch (e) {
      setError(adminErrorMessage(e));
    }
  };
  const byUser = new Map<string, AppRole[]>();
  for (const r of roles.data ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);

  return (
    <div className="max-w-3xl space-y-5">
      <Card>
        <h2 className="font-semibold">Grant a role</h2>
        <p className="mt-1 text-sm text-muted">Ask the person for the account ID shown in their Settings.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <div>
            <FieldLabel htmlFor="role-user">Account ID</FieldLabel>
            <TextInput id="role-user" value={target} onChange={(e) => setTarget(e.target.value.trim())} placeholder="00000000-0000-0000-0000-000000000000" />
          </div>
          <div>
            <FieldLabel htmlFor="role-role">Role</FieldLabel>
            <Select id="role-role" value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
              {APP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <Button disabled={!UUID.test(target)} onClick={() => void change(target, role, true)}>
            Grant
          </Button>
        </div>
      </Card>
      {error && <Notice tone="error">{error}</Notice>}
      {roles.isLoading && <LoadingState />}
      <ul className="space-y-2" aria-label="Staff roles">
        {[...byUser.entries()].map(([id, rs]) => (
          <li key={id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
            <code className="min-w-0 flex-1 truncate text-sm">{id}</code>
            {id === userId && <Badge>You</Badge>}
            {rs.map((r) => (
              <span key={r} className="inline-flex items-center gap-1">
                <Badge tone="primary">{ROLE_LABELS[r]}</Badge>
                <Button size="sm" variant="ghost" onClick={() => void change(id, r, false)} aria-label={`Remove ${ROLE_LABELS[r]} role from ${id}`}>
                  Remove
                </Button>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityPanel({ api }: { api: AdminApi }) {
  const audit = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => api.listAudit(200) });
  if (audit.isLoading) return <LoadingState />;
  if (audit.isError) return <ErrorState message={adminErrorMessage(audit.error)} onRetry={() => audit.refetch()} />;
  return (
    <ol className="max-w-3xl space-y-1.5 text-sm" aria-label="Audit log">
      {audit.data!.map((a) => (
        <li key={a.id} className="flex flex-wrap gap-x-3 rounded-lg border border-line bg-surface px-3 py-2">
          <span className="text-muted">{new Date(a.created_at).toLocaleString()}</span>
          <span className="font-medium">{a.action}</span>
          <span>
            {a.entity_type} {a.entity_id?.slice(0, 8)}
          </span>
          {Object.keys(a.metadata).length > 0 && <span className="text-muted">{JSON.stringify(a.metadata)}</span>}
        </li>
      ))}
    </ol>
  );
}
