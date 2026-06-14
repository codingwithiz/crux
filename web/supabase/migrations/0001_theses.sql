-- Conviction Engine — Thesis Ledger (multi-user, row-level security)
-- Run this in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.theses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  topic           text not null default '',
  statement       text not null,
  confidence      text not null default 'med',
  evidence_for    text,
  steelman        text,
  change_my_mind  text,
  source_title    text,
  source_url      text,
  status          text not null default 'active',
  created_at      timestamptz not null default now()
);

create index if not exists theses_user_created_idx
  on public.theses (user_id, created_at desc);

alter table public.theses enable row level security;

-- Each user can only see and modify their own theses.
create policy "theses_select_own" on public.theses
  for select using (auth.uid() = user_id);
create policy "theses_insert_own" on public.theses
  for insert with check (auth.uid() = user_id);
create policy "theses_update_own" on public.theses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "theses_delete_own" on public.theses
  for delete using (auth.uid() = user_id);
