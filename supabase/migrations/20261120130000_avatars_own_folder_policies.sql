-- A signed-in user can add, replace and remove only the photos in their own folder (avatars/<user id>/...). Reading stays public.
drop policy if exists avatars_own_insert on storage.objects;
drop policy if exists avatars_own_update on storage.objects;
drop policy if exists avatars_own_delete on storage.objects;
create policy avatars_own_insert on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_update on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_delete on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
update storage.buckets set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'avatars';
