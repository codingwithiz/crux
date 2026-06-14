-- Conviction Engine — automated daily radar (Phase 2: Curator automation).
-- A Vercel Cron job hits /api/cron/radar daily, scans the free AI sources, and
-- writes one snapshot row here (generic, popularity-normalized ranking). The
-- news view reads the latest snapshot so a prepared brief is always waiting;
-- per-user relevance ranking still happens client-side against your ledger.
-- The snapshot is global/public (the sources are public), so reads are open and
-- writes come from the Cron route using the service-role key (bypasses RLS).
-- Run after 0001_theses.sql.

create table if not exists public.radar_snapshots (
  id          uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  count       int not null default 0,
  items       jsonb not null default '[]'::jsonb
);

create index if not exists radar_snapshots_captured_idx
  on public.radar_snapshots (captured_at desc);

alter table public.radar_snapshots enable row level security;

-- Anyone (signed in or not) may read the latest scan.
create policy "radar_public_read" on public.radar_snapshots
  for select using (true);
