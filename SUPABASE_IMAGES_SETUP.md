# Image uploads — one-time Supabase setup

Run these once in your Supabase project. Until this is done, the photo
pickers will show but uploads will fail.

## 1. Create the storage bucket

Dashboard → **Storage** → **New bucket**
- Name: `activity-images`
- **Public bucket: ON** (so images can be viewed via their URL)
- Create.

## 2. Add columns to the tables

Dashboard → **SQL Editor** → run:

```sql
alter table activities add column if not exists image_urls text[];
alter table notes      add column if not exists image_urls text[];
```

## 3. Storage RLS policies (users only touch their own folder)

Dashboard → **SQL Editor** → run:

```sql
-- Anyone can read (bucket is public); writes/updates/deletes are scoped
-- to the signed-in user's own <userId>/ folder.

create policy "own uploads - insert"
on storage.objects for insert to authenticated
with check ( bucket_id = 'activity-images'
  and (storage.foldername(name))[1] = auth.uid()::text );

create policy "own uploads - update"
on storage.objects for update to authenticated
using ( bucket_id = 'activity-images'
  and (storage.foldername(name))[1] = auth.uid()::text );

create policy "own uploads - delete"
on storage.objects for delete to authenticated
using ( bucket_id = 'activity-images'
  and (storage.foldername(name))[1] = auth.uid()::text );

create policy "public read"
on storage.objects for select to public
using ( bucket_id = 'activity-images' );
```

That's it — photo uploads on activities and notes will work after this.
