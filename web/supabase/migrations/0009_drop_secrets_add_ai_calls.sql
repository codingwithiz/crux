-- Crux — remove the bring-your-own-key substrate, add per-call metering.
-- Run after 0008_thesis_outcome.sql.
--
-- Numbering note: 0006 was used twice (0006_carousel_schedule.sql and
-- 0006_radar.sql). Migrations are applied by hand in the Supabase SQL editor
-- (see SUPABASE.md), so ordering is a human's job. This file continues forward
-- from 0008; history is left as-is rather than renumbered under running code.

-- BYOK is gone: every call runs on the server key. These columns held provider
-- keys as plaintext, so dropping the table is also the fix for that.
drop table if exists public.user_secrets;

-- One row per model call. Backs the hourly per-user rate limit today; Phase 5
-- widens the same table with tokens / cost / latency for spend observability.
create table if not exists public.ai_calls (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  route       text not null,
  created_at  timestamptz not null default now()
);

-- The rate limit counts a user's calls in a trailing window, so it reads
-- (user_id, created_at) on every gated request.
create index if not exists ai_calls_user_time_idx
  on public.ai_calls (user_id, created_at desc);

alter table public.ai_calls enable row level security;

create policy "ai_calls_select_own" on public.ai_calls
  for select using (auth.uid() = user_id);
create policy "ai_calls_insert_own" on public.ai_calls
  for insert with check (auth.uid() = user_id);
