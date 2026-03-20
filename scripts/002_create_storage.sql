-- Create storage bucket for user images
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload images to their own folder
create policy "users_upload_images" on storage.objects for insert
  with check (
    bucket_id = 'images' and
    auth.uid() is not null and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to images
create policy "public_read_images" on storage.objects for select
  using (bucket_id = 'images');

-- Allow users to delete their own images
create policy "users_delete_images" on storage.objects for delete
  using (
    bucket_id = 'images' and
    auth.uid() is not null and
    (storage.foldername(name))[1] = auth.uid()::text
  );
