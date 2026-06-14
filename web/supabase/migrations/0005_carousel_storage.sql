-- Conviction Engine — persist rendered carousel PNGs to Supabase Storage.
-- Until now the `carousels` table stored only the editable slide DATA and the
-- Gallery re-rendered thumbnails on demand. This adds a public `carousels`
-- storage bucket so the actual exported images live as shareable URLs, plus an
-- `image_urls` column on the table to remember them. Run after 0002_carousels.sql.

-- 1. The bucket (public read; writes gated by the policies below).
insert into storage.buckets (id, name, public)
values ('carousels', 'carousels', true)
on conflict (id) do nothing;

-- 2. Remember the rendered image URLs alongside the slide data.
alter table public.carousels
  add column if not exists image_urls text[] not null default '{}';

-- 3. Storage RLS: a user may write only under their own top-level folder
--    (path = "{user_id}/{carousel_id}/slide-NN.png"); anyone may read.
create policy "carousel_images_public_read" on storage.objects
  for select using (bucket_id = 'carousels');

create policy "carousel_images_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'carousels' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "carousel_images_update_own" on storage.objects
  for update using (
    bucket_id = 'carousels' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "carousel_images_delete_own" on storage.objects
  for delete using (
    bucket_id = 'carousels' and (storage.foldername(name))[1] = auth.uid()::text
  );
