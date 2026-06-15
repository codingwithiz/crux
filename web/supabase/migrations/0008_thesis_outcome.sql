-- Conviction Engine — thesis outcomes for calibration ("keep score", PLAN A2 §7).
-- Once reality weighs in you mark how a call turned out (held / mixed / broke);
-- the Ledger then scores how well your stated confidence matched reality.
-- Run after 0001_theses.sql.

alter table public.theses
  add column if not exists outcome     text,
  add column if not exists resolved_at timestamptz;
