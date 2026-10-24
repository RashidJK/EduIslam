import { useId, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CONTENT_CLASSES, STATUS_LABELS, type ContentClass } from '@/domain/content/schema';
import { availableTransitions, canCreate, canEdit, type AppRole } from '@/domain/content/workflow';
import { adminErrorMessage, type AdminApi } from '@/data/supabase/adminApi';
import { CONTENT_TYPE_LABELS, CONTENT_TYPES, type ContentRow, type ContentType } from '@/data/supabase/contentRows';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldLabel, Select, TextInput } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { ContentPreview } from './ContentPreview';
import { TEMPLATES } from './templates';
import { checkDraft } from './validation';

const CLASS_LABELS: Record<ContentClass, string> = {
  religious: 'Religious (needs sources and review)',
  linguistic: 'Language lesson',
  'app-guide': 'App guide / structure',
  sample: 'Sample (shown with a notice)',
};

export function ContentEditor({
  api,
  row,
  userId,
  roles,
  onSaved,
}: {
  api: AdminApi;
  row: ContentRow | null;
  userId: string;
  roles: readonly AppRole[];
  /** Called with the saved row and a confirmation message (the editor remounts afterwards). */
  onSaved: (row: ContentRow, message: string) => void;
}) {
  const [type, setType] = useState<ContentType>(row?.content_type ?? 'dua');
  const [slug, setSlug] = useState(row?.slug ?? '');
  const [title, setTitle] = useState(row?.title ?? '');
  const [contentClass, setContentClass] = useState<ContentClass>(row?.content_class ?? TEMPLATES.dua.contentClass);
  const [payloadText, setPayloadText] = useState(() => JSON.stringify(row?.payload ?? TEMPLATES.dua.payload, null, 2));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { type: useId(), slug: useId(), title: useId(), cls: useId(), payload: useId(), notes: useId() };

  const editable = row ? canEdit(row.status, roles) : canCreate(roles);
  const versions = useQuery({ queryKey: ['admin', 'versions', row?.id, row?.version, row?.status], queryFn: () => api.listVersions(row!.id), enabled: Boolean(row) });
  const editorIds = (versions.data ?? []).filter((v) => v.kind !== 'status' && v.edited_by).map((v) => v.edited_by!);
  const transitions = row ? availableTransitions(row.status, roles, { userId, authorId: row.author_id, updatedBy: row.updated_by, editorIds }) : [];
  const reviews = useQuery({ queryKey: ['admin', 'reviews', row?.id, row?.status], queryFn: () => api.listReviews(row!.id), enabled: Boolean(row) });

  const parsedPayload = useMemo(() => {
    try {
      const v = JSON.parse(payloadText) as unknown;
      return v && typeof v === 'object' && !Array.isArray(v) ? { ok: true as const, value: v as Record<string, unknown> } : { ok: false as const, error: 'The payload must be a JSON object.' };
    } catch (e) {
      return { ok: false as const, error: `Invalid JSON: ${(e as Error).message}` };
    }
  }, [payloadText]);

  const check = parsedPayload.ok
    ? checkDraft({ id: row?.id ?? 'new', content_type: type, slug, title, language: 'en', content_class: contentClass, payload: parsedPayload.value, version: row?.version ?? 1 })
    : null;
  const dirty = !row || row.slug !== slug || row.title !== title || row.content_class !== contentClass || JSON.stringify(row.payload) !== JSON.stringify(parsedPayload.ok ? parsedPayload.value : null);

  const run = async (fn: () => Promise<ContentRow>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await fn();
      setNotes('');
      onSaved(saved, done);
    } catch (e) {
      setError(adminErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!parsedPayload.ok) return;
    if (!row) void run(() => api.createDraft({ contentType: type, slug, title, contentClass, payload: parsedPayload.value }), 'Draft created.');
    else void run(() => api.updateDraft(row.id, { slug, title, contentClass, payload: parsedPayload.value }), 'Draft saved.');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">{row ? row.title : 'New draft'}</h2>
        {row && <Badge tone={row.status === 'published' ? 'success' : row.status === 'changes_requested' ? 'warning' : 'neutral'}>{STATUS_LABELS[row.status]}</Badge>}
        {row && <span className="text-sm text-muted">Version {row.version}</span>}
      </div>
      {row?.review_notes && (
        <Notice tone={row.status === 'changes_requested' ? 'warning' : 'info'} title="Reviewer notes">
          {row.review_notes}
        </Notice>
      )}
      {!editable && row && <Notice tone="info">This item can’t be edited while it is {STATUS_LABELS[row.status].toLowerCase()}. Move it back to draft to make changes.</Notice>}

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor={ids.type}>Content type</FieldLabel>
            <Select
              id={ids.type}
              value={type}
              disabled={Boolean(row)}
              onChange={(e) => {
                const t = e.target.value as ContentType;
                setType(t);
                setContentClass(TEMPLATES[t].contentClass);
                setPayloadText(JSON.stringify(TEMPLATES[t].payload, null, 2));
              }}
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONTENT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor={ids.cls}>Content class</FieldLabel>
            <Select id={ids.cls} value={contentClass} disabled={!editable} onChange={(e) => setContentClass(e.target.value as ContentClass)}>
              {CONTENT_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {CLASS_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor={ids.title}>Title</FieldLabel>
            <TextInput id={ids.title} value={title} disabled={!editable} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor={ids.slug} hint="Lowercase letters, numbers and hyphens.">
              Slug
            </FieldLabel>
            <TextInput id={ids.slug} value={slug} disabled={!editable} onChange={(e) => setSlug(e.target.value)} />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor={ids.payload} hint="Type-specific fields as JSON. Enter Arabic text, sources, and gradings exactly as they appear in the cited source.">
            Content fields
          </FieldLabel>
          <textarea
            id={ids.payload}
            value={payloadText}
            disabled={!editable}
            onChange={(e) => setPayloadText(e.target.value)}
            rows={14}
            spellCheck={false}
            className="block w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 font-mono text-sm focus:border-primary focus:outline-none"
          />
        </div>
        {editable && (
          <div className="flex justify-end">
            <Button onClick={save} loading={busy} disabled={!parsedPayload.ok || !slug || !title || !dirty}>
              {row ? 'Save draft' : 'Create draft'}
            </Button>
          </div>
        )}
      </Card>

      <section aria-labelledby="checks" className="space-y-2">
        <h3 id="checks" className="font-semibold">
          Checks
        </h3>
        {!parsedPayload.ok && <Notice tone="error">{parsedPayload.error}</Notice>}
        {check && check.structure.length > 0 && (
          <Notice tone="warning" title="Fix before publishing">
            <ul className="list-disc pl-5">
              {check.structure.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Notice>
        )}
        {check && check.beforePublishing.length > 0 && (
          <Notice tone="info" title="Publishing requirements">
            <ul className="list-disc pl-5">
              {check.beforePublishing.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Notice>
        )}
        {check && check.structure.length === 0 && <p className="text-sm text-success">The content structure is valid.</p>}
      </section>

      {row && (
        <section aria-labelledby="workflow" className="space-y-3">
          <h3 id="workflow" className="font-semibold">
            Review workflow
          </h3>
          {transitions.length === 0 ? (
            <p className="text-sm text-muted">No workflow actions are available to your role for this item right now.</p>
          ) : (
            <>
              {transitions.some((t) => t.needsNotes || t.to === 'approved') && (
                <div>
                  <label htmlFor={ids.notes} className="mb-1.5 block text-sm font-medium">
                    Review notes
                  </label>
                  <textarea
                    id={ids.notes}
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="block w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 focus:border-primary focus:outline-none"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {transitions.map((t) => (
                  <Button
                    key={t.to}
                    variant={t.to === 'published' || t.to === 'approved' ? 'primary' : 'secondary'}
                    disabled={busy || dirty || (t.needsNotes && !notes.trim())}
                    onClick={() => void run(() => api.transition(row.id, t.to, notes.trim() || undefined), `${t.label}: done.`)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
              {dirty && <p className="text-sm text-muted">Save your changes before moving this item through review.</p>}
            </>
          )}
        </section>
      )}

      <div aria-live="polite">
        {error && (
          <Notice tone="error" live>
            {error}
          </Notice>
        )}
      </div>

      {check?.parsed != null && (
        <section aria-labelledby="preview">
          <h3 id="preview" className="mb-2 font-semibold">
            Preview — as learners will see it
          </h3>
          <ContentPreview type={type} item={check.parsed} />
        </section>
      )}

      {row && (
        <section aria-labelledby="history" className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 id="history" className="mb-2 font-semibold">
              Version history
            </h3>
            <ol className="space-y-1 text-sm">
              {(versions.data ?? []).map((v, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-medium">v{v.version}</span>
                  <span>{v.kind === 'status' ? STATUS_LABELS[v.status] : v.kind === 'create' ? 'Created' : 'Edited'}</span>
                  <span className="text-muted">{new Date(v.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Reviews</h3>
            {(reviews.data ?? []).length === 0 ? (
              <p className="text-sm text-muted">No reviews yet.</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {reviews.data!.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium">v{r.version}</span> {r.decision === 'approved' ? 'Approved' : 'Changes requested'}
                    {r.notes && <span className="text-muted"> — {r.notes}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
