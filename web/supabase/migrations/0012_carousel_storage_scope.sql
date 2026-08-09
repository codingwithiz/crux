-- Crux — stop every user's slides being enumerable by anyone.
-- Run after 0011_user_interests.sql.
--
-- 0005 granted `select` on storage.objects for the whole carousels bucket, to
-- mean "the rendered PNGs are readable by URL". But on Supabase Storage `select`
-- also grants LIST: an anonymous client could list '' to enumerate every user's
-- uid folder, list each folder for carousel ids and filenames, then fetch each
-- public URL. Effectively every slide of every user was discoverable without
-- knowing a single link.
--
-- Listing is now owner-only. The bucket stays public so existing image URLs keep
-- resolving — the Gallery renders them directly in <img> tags, and they are
-- unguessable in practice (uuid/uuid/slide-NN.png). Making the bucket private
-- would additionally require signed URLs on every read, which is the right
-- follow-up if these decks ever hold anything sensitive.

drop policy if exists "carousel_images_public_read" on storage.objects;

create policy "carousel_images_list_own" on storage.objects
  for select using (
    bucket_id = 'carousels' and (storage.foldername(name))[1] = auth.uid()::text
  );
