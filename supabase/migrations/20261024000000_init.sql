-- Islamic Learning Companion — initial schema.
--
-- Security model
--  * Every table has row-level security enabled. The browser uses the public anon key, so
--    these policies are the real authorization boundary — never the UI.
--  * Learner data is private to its owner. Staff roles grant no access to it.
--  * Learners read content only through the published_content view, which exposes published
--    rows and learner-safe columns. The content table itself is readable by staff only.
--  * Status and review metadata change only through transition_content(), which enforces the
--    review workflow. A trigger rejects any other attempt to change workflow columns.
--  * Attribution columns (author, editor, reviewer, actor) deliberately have no foreign keys,
--    so the review trail survives when an account is deleted.

-- ---------------------------------------------------------------- types

create type public.app_role as enum ('admin', 'editor', 'reviewer', 'publisher');
create type public.publication_status as enum ('draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived');
create type public.content_class as enum ('religious', 'linguistic', 'app-guide', 'sample');
create type public.content_type as enum (
  'course', 'lesson', 'dua', 'dua_category', 'salah_path', 'salah_guide', 'story_collection', 'story', 'occasion'
);
create type public.review_decision as enum ('approved', 'changes_requested');

-- ---------------------------------------------------------------- identity

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Role checks run as definer so policies can consult user_roles without exposing it. They
-- only reveal whether the *caller* holds a role.
create function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = r);
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid());
$$;

-- A profile row is created for every new account.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- learner data
-- The learner's state is one validated document per user (see docs/ARCHITECTURE.md for the
-- trade-off versus one table per concept). It is never readable by anyone but its owner.

create table public.learner_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  schema_version integer not null check (schema_version >= 1),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  -- Guards against unbounded growth from a misbehaving client (~2 MB).
  constraint learner_state_size check (pg_column_size(data) < 2000000),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- content

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  content_type public.content_type not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  language text not null default 'en',
  content_class public.content_class not null,
  status public.publication_status not null default 'draft',
  -- Type-specific fields, validated by the app's schemas before display.
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  version integer not null default 1,
  author_id uuid,
  updated_by uuid,
  reviewed_by uuid,
  reviewer_name text,
  reviewed_at timestamptz,
  review_notes text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, language, slug),
  -- Duas, Salah guides, stories and occasions always make religious claims; structural items
  -- (categories, paths, collections) never do. Relabelling cannot be used to skip review.
  constraint content_class_matches_type check (
    case
      when content_type in ('dua', 'salah_guide', 'story', 'occasion') then content_class = 'religious'
      when content_type in ('dua_category', 'salah_path', 'story_collection') then content_class = 'app-guide'
      else true
    end
  )
);
create index content_items_status_idx on public.content_items (status, content_type);

create table public.content_versions (
  id bigint generated always as identity primary key,
  content_id uuid not null references public.content_items (id) on delete cascade,
  version integer not null,
  -- 'create' and 'edit' rows mark who wrote the content; 'status' rows mark workflow steps.
  kind text not null check (kind in ('create', 'edit', 'status')),
  status public.publication_status not null,
  title text not null,
  payload jsonb not null,
  edited_by uuid,
  created_at timestamptz not null default now()
);
create index content_versions_content_idx on public.content_versions (content_id, version);

create table public.content_reviews (
  id bigint generated always as identity primary key,
  content_id uuid not null references public.content_items (id) on delete cascade,
  version integer not null,
  reviewer_id uuid,
  decision public.review_decision not null,
  notes text,
  created_at timestamptz not null default now()
);
create index content_reviews_content_idx on public.content_reviews (content_id, version);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- What learners can read: published items, without internal fields (editorial notes, staff IDs,
-- reviewer notes). The view runs with its owner's rights and applies its own filter.
create view public.published_content as
  select
    id, content_type, slug, title, language, content_class, status,
    payload - 'editorialNotes' as payload,
    version,
    null::uuid as author_id,
    null::uuid as updated_by,
    reviewer_name, reviewed_at,
    null::text as review_notes,
    published_at, updated_at
  from public.content_items
  where status = 'published';

-- ---------------------------------------------------------------- content triggers

-- True only inside transition_content(): the flag is set there, and current_user is the
-- function owner rather than a client role. Clients cannot satisfy both.
create function public.in_workflow() returns boolean
language sql stable as $$
  select coalesce(current_setting('app.status_transition', true), '') = 'on'
     and current_user not in ('anon', 'authenticated');
$$;

-- Runs with the caller's rights so in_workflow() can see who is really making the change.
create function public.content_before_write() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.version := 1;
    new.status := 'draft';
    new.author_id := auth.uid();
    new.updated_by := auth.uid();
    new.reviewed_by := null; new.reviewer_name := null; new.reviewed_at := null;
    new.review_notes := null; new.published_at := null;
    new.created_at := now(); new.updated_at := now();
    return new;
  end if;

  if public.in_workflow() then
    new.updated_at := now();
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'Status can only be changed through transition_content()' using errcode = '42501';
  end if;
  if new.content_type is distinct from old.content_type then
    raise exception 'The content type of an item cannot be changed' using errcode = '42501';
  end if;
  -- Workflow columns always keep their values; clients cannot set them.
  new.id := old.id;
  new.author_id := old.author_id;
  new.reviewed_by := old.reviewed_by;
  new.reviewer_name := old.reviewer_name;
  new.reviewed_at := old.reviewed_at;
  new.review_notes := old.review_notes;
  new.published_at := old.published_at;
  new.created_at := old.created_at;
  new.updated_by := auth.uid();
  if (new.payload, new.title, new.content_class, new.slug, new.language) is distinct from
     (old.payload, old.title, old.content_class, old.slug, old.language) then
    new.version := old.version + 1;
  else
    new.version := old.version;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger content_before_write before insert or update on public.content_items
  for each row execute function public.content_before_write();

create function public.content_after_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.content_versions (content_id, version, kind, status, title, payload, edited_by)
    values (new.id, new.version, 'create', new.status, new.title, new.payload, auth.uid());
    insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'content.create', new.content_type::text, new.id::text, jsonb_build_object('slug', new.slug));
  elsif new.version <> old.version then
    insert into public.content_versions (content_id, version, kind, status, title, payload, edited_by)
    values (new.id, new.version, 'edit', new.status, new.title, new.payload, auth.uid());
    insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'content.edit', new.content_type::text, new.id::text, jsonb_build_object('version', new.version));
  elsif new.status <> old.status then
    insert into public.content_versions (content_id, version, kind, status, title, payload, edited_by)
    values (new.id, new.version, 'status', new.status, new.title, new.payload, auth.uid());
  end if;
  return new;
end;
$$;

create trigger content_after_write after insert or update on public.content_items
  for each row execute function public.content_after_write();

-- ---------------------------------------------------------------- workflow

-- Requirements to publish, mirrored in src/domain/content/schema.ts for UI hints.
create function public.publishing_problems(item public.content_items) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare
  problems text[] := '{}';
  sources jsonb := coalesce(item.payload -> 'sources', '[]'::jsonb);
begin
  if item.content_class = 'religious' then
    if jsonb_typeof(sources) <> 'array' or jsonb_array_length(sources) = 0 then
      problems := array_append(problems, 'Religious content needs at least one source.');
    elsif exists (
      select 1 from jsonb_array_elements(sources) s
      where jsonb_typeof(s) <> 'object' or coalesce(trim(s ->> 'title'), '') = ''
    ) then
      problems := array_append(problems, 'Every source needs a title.');
    end if;
    if not exists (
      select 1 from public.content_reviews r
      where r.content_id = item.id and r.version = item.version and r.decision = 'approved'
    ) then
      problems := array_append(problems, 'The current version has not been approved by a reviewer.');
    end if;
  end if;
  if item.content_class = 'sample' and coalesce(item.payload ->> 'notice', '') = '' then
    problems := array_append(problems, 'Sample content must carry a visible notice.');
  end if;
  return problems;
end;
$$;

create function public.transition_content(item_id uuid, to_status public.publication_status, notes text default null)
returns public.content_items
language plpgsql security definer set search_path = public as $$
declare
  item public.content_items;
  actor uuid := auth.uid();
  allowed boolean := false;
  problems text[];
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  select * into item from public.content_items where id = item_id for update;
  if not found then
    raise exception 'Content not found' using errcode = 'P0002';
  end if;

  case
    when item.status in ('draft', 'changes_requested') and to_status = 'in_review' then
      allowed := has_role('editor') or has_role('admin');
    when item.status = 'changes_requested' and to_status = 'draft' then
      allowed := has_role('editor') or has_role('admin');
    when item.status = 'in_review' and to_status in ('approved', 'changes_requested') then
      allowed := has_role('reviewer') or has_role('admin');
      -- Nobody reviews content they have ever written or edited, whatever their role.
      if allowed and (
        item.author_id = actor
        or exists (select 1 from public.content_versions v where v.content_id = item.id and v.edited_by = actor and v.kind in ('create', 'edit'))
      ) then
        raise exception 'You cannot review content you wrote or edited' using errcode = '42501';
      end if;
    when item.status = 'approved' and to_status = 'published' then
      allowed := has_role('publisher') or has_role('admin');
    when item.status = 'approved' and to_status = 'changes_requested' then
      allowed := has_role('reviewer') or has_role('publisher') or has_role('admin');
    when item.status = 'published' and to_status in ('archived', 'draft') then
      allowed := has_role('publisher') or has_role('admin');
    when item.status = 'archived' and to_status = 'draft' then
      allowed := has_role('editor') or has_role('admin');
    else
      raise exception 'Cannot move content from % to %', item.status, to_status using errcode = '22023';
  end case;

  if not allowed then
    raise exception 'Your role does not allow moving content from % to %', item.status, to_status using errcode = '42501';
  end if;

  if to_status = 'published' then
    problems := public.publishing_problems(item);
    if coalesce(array_length(problems, 1), 0) > 0 then
      raise exception 'Cannot publish: %', array_to_string(problems, ' ') using errcode = '23514';
    end if;
  end if;

  perform set_config('app.status_transition', 'on', true);

  if to_status in ('approved', 'changes_requested') and item.status = 'in_review' then
    insert into public.content_reviews (content_id, version, reviewer_id, decision, notes)
    values (item.id, item.version, actor, to_status::text::public.review_decision, notes);
    update public.content_items
      set status = to_status, reviewed_by = actor,
          reviewer_name = coalesce((select display_name from public.profiles where id = actor), 'Reviewer'),
          reviewed_at = now(), review_notes = notes
      where id = item.id returning * into item;
  elsif to_status = 'published' then
    update public.content_items set status = to_status, published_at = now() where id = item.id returning * into item;
  else
    update public.content_items set status = to_status, review_notes = coalesce(notes, review_notes) where id = item.id returning * into item;
  end if;

  perform set_config('app.status_transition', 'off', true);

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'content.transition', item.content_type::text, item.id::text, jsonb_build_object('to', to_status, 'version', item.version));
  return item;
end;
$$;

-- Role management, admins only, audited.
create function public.set_user_role(target uuid, r public.app_role, grant_role boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_role('admin') then
    raise exception 'Only admins can manage roles' using errcode = '42501';
  end if;
  if grant_role then
    insert into public.user_roles (user_id, role, granted_by) values (target, r, auth.uid()) on conflict do nothing;
  else
    if target = auth.uid() and r = 'admin' then
      raise exception 'Admins cannot remove their own admin role' using errcode = '42501';
    end if;
    delete from public.user_roles where user_id = target and role = r;
  end if;
  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), case when grant_role then 'role.grant' else 'role.revoke' end, 'user', target::text, jsonb_build_object('role', r));
end;
$$;

-- Lets a learner delete their account and all learning data. Content attribution and the
-- audit trail are kept (as IDs without the account). See docs/CONTENT_REVIEW.md.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------- row-level security

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.learner_state enable row level security;
alter table public.content_items enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_reviews enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "profiles: owner reads" on public.profiles for select using (id = auth.uid());
create policy "profiles: owner updates" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "roles: read own or admin" on public.user_roles for select using (user_id = auth.uid() or public.has_role('admin'));
-- No insert/update/delete policies: roles change only through set_user_role().

create policy "learner_state: owner reads" on public.learner_state for select using (user_id = auth.uid());
create policy "learner_state: owner inserts" on public.learner_state for insert with check (user_id = auth.uid());
create policy "learner_state: owner updates" on public.learner_state for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "learner_state: owner deletes" on public.learner_state for delete using (user_id = auth.uid());

create policy "content: staff read" on public.content_items for select using (public.is_staff());
create policy "content: editors create drafts" on public.content_items for insert
  with check ((public.has_role('editor') or public.has_role('admin')) and status = 'draft');
create policy "content: editors edit drafts" on public.content_items for update
  using ((public.has_role('editor') or public.has_role('admin')) and status in ('draft', 'changes_requested'))
  with check (status in ('draft', 'changes_requested'));
create policy "content: admins delete drafts or archived" on public.content_items for delete
  using (public.has_role('admin') and status in ('draft', 'archived'));

create policy "versions: staff read" on public.content_versions for select using (public.is_staff());
create policy "reviews: staff read" on public.content_reviews for select using (public.is_staff());
create policy "audit: admins read" on public.admin_audit_log for select using (public.has_role('admin'));

-- ---------------------------------------------------------------- privileges
-- Supabase grants EXECUTE on new functions to anon and authenticated by default, so every
-- function is locked down explicitly and re-granted only where needed.

revoke execute on function public.transition_content(uuid, public.publication_status, text) from public, anon, authenticated;
revoke execute on function public.set_user_role(uuid, public.app_role, boolean) from public, anon, authenticated;
revoke execute on function public.delete_my_account() from public, anon, authenticated;
revoke execute on function public.publishing_problems(public.content_items) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.content_after_write() from public, anon, authenticated;

grant execute on function public.transition_content(uuid, public.publication_status, text) to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role, boolean) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
-- Needed by RLS policies and the status trigger when evaluated as the caller.
grant execute on function public.has_role(public.app_role) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.in_workflow() to anon, authenticated;
grant execute on function public.content_before_write() to anon, authenticated;

revoke all on public.published_content from public, anon, authenticated;
grant select on public.published_content to anon, authenticated;
