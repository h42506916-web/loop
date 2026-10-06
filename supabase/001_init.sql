-- =====================================================================
-- Loop - 001_init.sql: profiles, follows, posts, RLS, signup trigger, RPCs
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Then run 002_storage.sql. Both files are safe to re-run.
--
-- Accounts are USERNAME + PASSWORD. The site signs in with the synthetic
-- email <username>@loop.local (never emailed), so Authentication ->
-- Sign In / Providers -> Email -> "Confirm email" must be OFF.
-- =====================================================================

begin;

-- 1. Tables -------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null,
  display_name text,
  bio          text,
  pronouns     text,
  website      text,
  avatar_url   text,
  banner_url   text,
  accent       text not null default 'lime',
  interests    text[] not null default '{}',
  onboarded    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Constraints are (re)created by name so re-running picks up changes.
alter table public.profiles drop constraint if exists profiles_username_key;
alter table public.profiles add constraint profiles_username_key unique (username);
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles add constraint profiles_username_check check (
  username ~ '^[a-z0-9._]{3,20}$' and username !~ '^\.' and username !~ '\.$' and position('..' in username) = 0);
alter table public.profiles drop constraint if exists profiles_display_name_check;
alter table public.profiles add constraint profiles_display_name_check check (
  display_name is null or char_length(btrim(display_name)) between 1 and 40);
alter table public.profiles drop constraint if exists profiles_bio_check;
alter table public.profiles add constraint profiles_bio_check check (bio is null or char_length(bio) <= 150);
alter table public.profiles drop constraint if exists profiles_pronouns_check;
alter table public.profiles add constraint profiles_pronouns_check check (pronouns is null or char_length(pronouns) <= 30);
alter table public.profiles drop constraint if exists profiles_website_check;
alter table public.profiles add constraint profiles_website_check check (
  website is null or (char_length(website) <= 200 and website ~* '^https?://[^[:space:]]+$'));
alter table public.profiles drop constraint if exists profiles_media_check;
alter table public.profiles add constraint profiles_media_check check (
  (avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url ~* '^https://'))
  and (banner_url is null or (char_length(banner_url) <= 500 and banner_url ~* '^https://')));
alter table public.profiles drop constraint if exists profiles_accent_check;
alter table public.profiles add constraint profiles_accent_check check (
  accent in ('lime', 'cyan', 'pink', 'violet', 'orange', 'mint', 'yellow', 'blue'));
alter table public.profiles drop constraint if exists profiles_interests_check;
alter table public.profiles add constraint profiles_interests_check check (cardinality(interests) <= 20);
alter table public.profiles drop constraint if exists profiles_onboarded_check;
alter table public.profiles add constraint profiles_onboarded_check check (not onboarded or display_name is not null);

create index if not exists profiles_created_idx on public.profiles (created_at desc);

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id)
);
alter table public.follows drop constraint if exists follows_no_self;
alter table public.follows add constraint follows_no_self check (follower_id <> following_id);
create index if not exists follows_following_idx on public.follows (following_id);

-- Placeholder for future posting; used for profile counts today.
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  kind       text not null,
  caption    text,
  media_url  text,
  thumb_url  text,
  created_at timestamptz not null default now()
);
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add constraint posts_kind_check check (kind in ('photo', 'clip', 'video'));
alter table public.posts drop constraint if exists posts_caption_check;
alter table public.posts add constraint posts_caption_check check (caption is null or char_length(caption) <= 2200);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);

-- 2. updated_at + profile guard ------------------------------------------
create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  -- the username is the login name and the row id never changes
  new.id := old.id;
  new.username := old.username;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update before update on public.profiles
  for each row execute function public.profiles_before_update();

-- 3. New auth user -> profile row ----------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
  v_user  text;
begin
  if v_email like '%@loop.local' then
    v_user := split_part(v_email, '@', 1);
  else
    v_user := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  end if;
  -- An invalid or taken username raises here, which rejects the signup.
  insert into public.profiles (id, username)
  values (new.id, v_user)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: accounts created before this file was run get a profile too.
insert into public.profiles (id, username)
select u.id, split_part(lower(u.email), '@', 1)
from auth.users u
where lower(u.email) like '%@loop.local'
  and split_part(lower(u.email), '@', 1) ~ '^[a-z0-9_]([a-z0-9._]{1,18})[a-z0-9_]$'
  and position('..' in u.email) = 0
on conflict do nothing;

-- 4. RPCs -----------------------------------------------------------------
create or replace function public.username_available(p_username text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text := lower(btrim(coalesce(p_username, '')));
begin
  if v !~ '^[a-z0-9._]{3,20}$' or v ~ '^\.' or v ~ '\.$' or position('..' in v) > 0 then
    return false;
  end if;
  return not exists (select 1 from public.profiles where username = v)
     and not exists (select 1 from auth.users where lower(email) = v || '@loop.local');
end;
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Search by username or display name (profiles are public anyway).
create or replace function public.search_profiles(p_query text, p_limit int default 20)
returns setof public.profiles
language sql
stable
set search_path = public
as $$
  with q as (
    select lower(btrim(coalesce(p_query, ''))) as s
  ), e as (
    select s, replace(replace(replace(s, '\', '\\'), '%', '\%'), '_', '\_') as pat from q
  )
  select p.* from public.profiles p, e
  where e.s <> '' and p.onboarded
    and (p.username like '%' || e.pat || '%' or lower(coalesce(p.display_name, '')) like '%' || e.pat || '%')
  order by (p.username = e.s) desc, (p.username like e.pat || '%') desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.search_profiles(text, int) from public;
grant execute on function public.search_profiles(text, int) to anon, authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.profiles_before_update() from public, anon, authenticated;

-- 5. Row level security ----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.follows  enable row level security;
alter table public.posts    enable row level security;

drop policy if exists profiles_read_all   on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_read_all on public.profiles for select to anon, authenticated using (true);
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists follows_read_all   on public.follows;
drop policy if exists follows_insert_own on public.follows;
drop policy if exists follows_delete_own on public.follows;
create policy follows_read_all on public.follows for select to anon, authenticated using (true);
create policy follows_insert_own on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()));
create policy follows_delete_own on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

drop policy if exists posts_read_all   on public.posts;
drop policy if exists posts_insert_own on public.posts;
drop policy if exists posts_update_own on public.posts;
drop policy if exists posts_delete_own on public.posts;
create policy posts_read_all on public.posts for select to anon, authenticated using (true);
create policy posts_insert_own on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy posts_update_own on public.posts for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy posts_delete_own on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));

-- Table privileges: read for everyone, writes only on the columns users own.
revoke all on public.profiles, public.follows, public.posts from anon, authenticated;
grant select on public.profiles, public.follows, public.posts to anon, authenticated;
grant insert (id, username, display_name, bio, pronouns, website, avatar_url, banner_url, accent, interests, onboarded)
  on public.profiles to authenticated;
grant update (display_name, bio, pronouns, website, avatar_url, banner_url, accent, interests, onboarded)
  on public.profiles to authenticated;
grant insert (follower_id, following_id), delete on public.follows to authenticated;
grant insert (author_id, kind, caption, media_url, thumb_url), update (caption), delete
  on public.posts to authenticated;

commit;
