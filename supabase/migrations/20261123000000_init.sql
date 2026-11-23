-- firstnote — full database schema.
-- Run once in a fresh Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: everything is created with IF NOT EXISTS / OR REPLACE.

create extension if not exists pgcrypto;

-- ───────────────────────── Profiles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  team_role text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- A profile is created for every new sign-up from the name/role sent with signUp().
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, team_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), ''),
    coalesce(new.raw_user_meta_data ->> 'team_role', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────── Workspaces ────────────────────────
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create or replace function public.is_member(_ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = _ws and user_id = auth.uid());
$$;

-- Do two users share a team? (lets teammates see each other's profiles)
create or replace function public.shares_workspace(_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid() and b.user_id = _other
  );
$$;

-- ─────────────────────── Team data ──────────────────────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'todo',
  category text not null default 'Hardware',
  award text,
  assignee_id uuid references public.profiles (id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null,
  content text not null default '',
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  label text not null default '',
  auto_score int not null default 0,
  teleop_score int not null default 0,
  endgame_score int not null default 0,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  page_number int not null,
  title text not null default '',
  status text not null default 'not_started',
  assignee_id uuid references public.profiles (id) on delete set null,
  unique (workspace_id, page_number)
);

create index if not exists tasks_ws_idx on public.tasks (workspace_id);
create index if not exists journal_ws_idx on public.journal_entries (workspace_id, entry_date desc);
create index if not exists matches_ws_idx on public.matches (workspace_id);
create index if not exists members_user_idx on public.workspace_members (user_id);

-- ─────────────────────── RPC functions ──────────────────────
-- Creates a team, adds the caller and seeds the 15 portfolio pages.
create or replace function public.create_workspace(_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.workspaces (name, created_by) values (trim(_name), auth.uid()) returning id into ws;
  insert into public.workspace_members (workspace_id, user_id) values (ws, auth.uid());
  insert into public.portfolio_pages (workspace_id, page_number)
    select ws, n from generate_series(1, 15) as n;
  return ws;
end $$;

create or replace function public.join_workspace(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into ws from public.workspaces where invite_code = upper(trim(_code));
  if ws is null then raise exception 'Invite code not found'; end if;
  insert into public.workspace_members (workspace_id, user_id) values (ws, auth.uid())
    on conflict do nothing;
  return ws;
end $$;

-- ───────────────────────── Forum ────────────────────────────
-- Public short posts (Twitter-like). parent_id is set for replies.
create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  parent_id uuid references public.forum_posts (id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 280),
  country text,
  created_at timestamptz not null default now()
);
create index if not exists forum_posts_feed_idx on public.forum_posts (created_at desc) where parent_id is null;
create index if not exists forum_posts_parent_idx on public.forum_posts (parent_id);

create table if not exists public.forum_likes (
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ─────────────────────── Row level security ─────────────────
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.tasks enable row level security;
alter table public.journal_entries enable row level security;
alter table public.matches enable row level security;
alter table public.portfolio_pages enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_likes enable row level security;

do $$
declare r record;
begin
  -- start clean so the script can be re-run
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Profiles: any signed-in user can see names/avatars (needed for the forum); you edit only yours.
create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());

-- Workspaces: members see them; only the creator renames or deletes.
create policy "ws read" on public.workspaces for select to authenticated using (public.is_member(id));
create policy "ws update" on public.workspaces for update to authenticated using (created_by = auth.uid());
create policy "ws delete" on public.workspaces for delete to authenticated using (created_by = auth.uid());

-- Members: teammates see each other; you can leave a team.
create policy "members read" on public.workspace_members for select to authenticated using (public.is_member(workspace_id));
create policy "members leave" on public.workspace_members for delete to authenticated using (user_id = auth.uid());

-- Team tables: full access for members of that team.
create policy "tasks all" on public.tasks for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy "matches all" on public.matches for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy "pages all" on public.portfolio_pages for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy "journal read" on public.journal_entries for select to authenticated using (public.is_member(workspace_id));
create policy "journal write" on public.journal_entries for insert to authenticated with check (public.is_member(workspace_id) and author_id = auth.uid());
create policy "journal edit own" on public.journal_entries for update to authenticated using (author_id = auth.uid());
create policy "journal delete own" on public.journal_entries for delete to authenticated using (author_id = auth.uid());

-- Forum: everyone signed in reads; you post, like and delete only as yourself.
create policy "forum read" on public.forum_posts for select to authenticated using (true);
create policy "forum post" on public.forum_posts for insert to authenticated with check (author_id = auth.uid());
create policy "forum delete own" on public.forum_posts for delete to authenticated using (author_id = auth.uid());
create policy "likes read" on public.forum_likes for select to authenticated using (true);
create policy "likes add" on public.forum_likes for insert to authenticated with check (user_id = auth.uid());
create policy "likes remove" on public.forum_likes for delete to authenticated using (user_id = auth.uid());

grant execute on function public.create_workspace(text), public.join_workspace(text), public.is_member(uuid) to authenticated;

-- ───────────────────────── Realtime ─────────────────────────
-- Live updates for the team boards and the forum.
do $$
declare t text;
begin
  foreach t in array array['tasks','journal_entries','matches','portfolio_pages','workspace_members','forum_posts','forum_likes'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ──────────────────── Accounts overview (admin) ──────────────
-- All accounts in one table for the dashboard: Table Editor → schema "admin" → accounts.
-- Lives outside "public", so the website API can't read it — only you in the dashboard.
create schema if not exists admin;
revoke all on schema admin from anon, authenticated;

create or replace view admin.accounts as
select
  u.id,
  u.email,
  p.full_name,
  p.team_role,
  u.raw_user_meta_data ->> 'country' as country,
  u.raw_user_meta_data ->> 'area' as area,
  (select count(*) from public.workspace_members m where m.user_id = u.id) as teams,
  (select count(*) from public.forum_posts f where f.author_id = u.id) as forum_posts,
  u.email_confirmed_at is not null as email_confirmed,
  u.created_at,
  u.last_sign_in_at
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;
