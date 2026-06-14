-- Conviction Engine — saved carousels (multi-user, row-level security)
-- Stores the editable slide DATA (not images); PNGs are re-rendered on demand.
-- Run after 0001_theses.sql.

create table if not exists public.carousels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'Untitled',
  slides      jsonb not null default '[]'::jsonb,
  theme_id    text not null default 'ink',
  handle      text not null default '@you',
  created_at  timestamptz not null default now()
);

create index if not exists carousels_user_created_idx
  on public.carousels (user_id, created_at desc);

alter table public.carousels enable row level security;

create policy "carousels_select_own" on public.carousels
  for select using (auth.uid() = user_id);
create policy "carousels_insert_own" on public.carousels
  for insert with check (auth.uid() = user_id);
create policy "carousels_update_own" on public.carousels
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "carousels_delete_own" on public.carousels
  for delete using (auth.uid() = user_id);
