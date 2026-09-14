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
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.daily_records enable row level security;
alter table public.study_notes enable row level security;

create policy "Users can manage their daily records" on public.daily_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their study notes" on public.study_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
