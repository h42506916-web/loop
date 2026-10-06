-- =====================================================================
-- Loop - 002_storage.sql: public 'avatars' and 'banners' buckets
-- Run after 001_init.sql (SQL Editor -> New query -> paste -> Run). Safe to re-run.
-- Files live at <bucket>/<user id>/<file>; signed-in users can only write
-- inside the folder named after their own user id. Anyone can read.
-- =====================================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('banners', 'banners', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists loop_media_public_read on storage.objects;
drop policy if exists loop_media_insert_own  on storage.objects;
drop policy if exists loop_media_update_own  on storage.objects;
drop policy if exists loop_media_delete_own  on storage.objects;

create policy loop_media_public_read on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars', 'banners'));

create policy loop_media_insert_own on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy loop_media_update_own on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy loop_media_delete_own on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
