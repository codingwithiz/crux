-- Conviction Engine — per-user model API keys, stored server-side (RLS).
-- Keeps keys off localStorage and out of request bodies for signed-in users.
-- Run after 0001_theses.sql. (Encrypted at rest by Supabase; for stricter
-- handling, migrate these columns to Supabase Vault later.)

create table if not exists public.user_secrets (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  google_key     text,
  openai_key     text,
  anthropic_key  text,
  updated_at     timestamptz not null default now()
);

alter table public.user_secrets enable row level security;

create policy "user_secrets_select_own" on public.user_secrets
  for select using (auth.uid() = user_id);
create policy "user_secrets_insert_own" on public.user_secrets
  for insert with check (auth.uid() = user_id);
create policy "user_secrets_update_own" on public.user_secrets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_secrets_delete_own" on public.user_secrets
  for delete using (auth.uid() = user_id);
