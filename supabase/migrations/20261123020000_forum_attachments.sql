-- Forum attachments: photos, videos and small files in a public "forum" storage bucket.
alter table public.forum_posts add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.forum_posts drop constraint if exists forum_posts_content_check;
alter table public.forum_posts add constraint forum_posts_content_check check (
  char_length(trim(content)) <= 280
  and (char_length(trim(content)) >= 1 or jsonb_array_length(attachments) > 0)
  and jsonb_array_length(attachments) <= 4
);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('forum', 'forum', true, 26214400, array[
  'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime',
  'application/pdf','text/plain','application/zip','application/x-zip-compressed',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]) on conflict (id) do nothing;
create policy "forum files upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'forum' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "forum files delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'forum' and (storage.foldername(name))[1] = auth.uid()::text);
create or replace view admin.storage_usage as
select bucket_id, count(*) as files, pg_size_pretty(sum((metadata ->> 'size')::bigint)) as total
from storage.objects group by bucket_id;
revoke all on admin.storage_usage from anon, authenticated;
