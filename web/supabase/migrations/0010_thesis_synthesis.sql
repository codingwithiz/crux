-- Crux — persist the synthesis that grounded each thesis.
-- Run after 0009_drop_secrets_add_ai_calls.sql.
--
-- Until now the synthesis lived only in browser memory for the length of one
-- flow. A carousel made in that session was grounded in the source; the same
-- thesis re-opened from the Ledger later produced an *ungrounded* carousel with
-- no signal that anything was missing, because the citations and source context
-- were dropped at commit. Same defect on the repurpose path.
--
-- jsonb rather than normalized claim/evidence tables: nothing queries across
-- theses by claim yet, and a document column migrates forward cleanly if that
-- ever changes.

alter table public.theses
  add column if not exists synthesis jsonb;
