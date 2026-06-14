-- Conviction Engine — per-user writing voice (the moat: voice + taste data).
-- Stores a small corpus of the user's real posts plus a distilled style guide,
-- used to tune the Expressor so carousels sound like THEM. One row per user,
-- protected by row-level security. Run after 0001_theses.sql.

create table if not exists public.user_voice (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  samples     jsonb not null default '[]'::jsonb,
  guide       text,
  tone        text,
  emoji       boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table public.user_voice enable row level security;

create policy "user_voice_select_own" on public.user_voice
  for select using (auth.uid() = user_id);
create policy "user_voice_insert_own" on public.user_voice
  for insert with check (auth.uid() = user_id);
create policy "user_voice_update_own" on public.user_voice
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_voice_delete_own" on public.user_voice
  for delete using (auth.uid() = user_id);
