create table if not exists public.daily_records (
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.study_notes (
  user_id uuid references auth.users(id) on delete cascade not null,
  id text not null,
  data jsonb not null,
  title text,
  summary text,
  category text,
  learning_date date,
  created_at timestamptz,
  search_text text,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.study_notes add column if not exists title text;
alter table public.study_notes add column if not exists summary text;
alter table public.study_notes add column if not exists category text;
alter table public.study_notes add column if not exists learning_date date;
alter table public.study_notes add column if not exists created_at timestamptz;
alter table public.study_notes add column if not exists search_text text;
alter table public.study_notes add column if not exists deleted_at timestamptz;

update public.study_notes set
  title = coalesce(title, data ->> 'title'),
  summary = coalesce(summary, data ->> 'summary'),
  category = coalesce(category, data ->> 'category'),
  learning_date = coalesce(learning_date, nullif(data ->> 'learningDate', '')::date),
  created_at = coalesce(created_at, nullif(data ->> 'createdAt', '')::timestamptz, updated_at),
  search_text = coalesce(search_text, lower(concat_ws(' ', data ->> 'title', data ->> 'summary', data ->> 'tags')));

create index if not exists study_notes_user_date_idx on public.study_notes (user_id, learning_date desc, created_at desc, id desc) where deleted_at is null;
create index if not exists study_notes_user_category_idx on public.study_notes (user_id, category) where deleted_at is null;

alter table public.daily_records enable row level security;
alter table public.study_notes enable row level security;

drop policy if exists "Users can manage their daily records" on public.daily_records;
create policy "Users can manage their daily records" on public.daily_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage their study notes" on public.study_notes;
create policy "Users can manage their study notes" on public.study_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-images', 'note-images', false, 15728640, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their note images" on storage.objects;
create policy "Users can read their note images" on storage.objects
  for select to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their note images" on storage.objects;
create policy "Users can upload their note images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their note images" on storage.objects;
create policy "Users can update their note images" on storage.objects
  for update to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their note images" on storage.objects;
create policy "Users can delete their note images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);
