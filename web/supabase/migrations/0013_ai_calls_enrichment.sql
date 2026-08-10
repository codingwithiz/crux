-- Crux — what each model call actually cost.
-- Run after 0012_carousel_storage_scope.sql.
--
-- 0009 created ai_calls with (user_id, route) to back the hourly rate limit, and
-- its own comment promised this widening. Until now the substrate was poured and
-- nothing stood on it: every provider returns token usage on every call and it
-- was read only inside the test mock, while latency and attempt counts were
-- computed and written to stdout. The question "what did this carousel cost"
-- had no answer.
--
-- Purely additive, and every column is nullable: rows written by the old code
-- stay valid, and a failed recording can never fail the user's request.

alter table public.ai_calls
  -- Which step, not just which route: /api/express serves both express and
  -- explain, and they cost different amounts.
  add column if not exists label         text,
  add column if not exists model         text,
  add column if not exists input_tokens  integer,
  add column if not exists output_tokens integer,
  -- Priced at call time from a hardcoded map. Stored rather than derived so a
  -- later price change doesn't silently rewrite history.
  add column if not exists cost_usd      numeric(10, 6),
  add column if not exists latency_ms    integer,
  -- How many attempts the call took, so schema-repair churn is visible as spend.
  add column if not exists attempts      smallint,
  add column if not exists ok            boolean,
  -- Taxonomy, not a message: "rate_limited", "auth", "timeout", "schema", …
  add column if not exists error_code    text,
  -- Ties a row to the request that produced it, and to the x-request-id the
  -- client was handed when something went wrong.
  add column if not exists request_id    text;

-- "What did I spend today / on this step" scans a user's recent rows by label.
create index if not exists ai_calls_user_label_time_idx
  on public.ai_calls (user_id, label, created_at desc);

-- The row is inserted before the model call (so the rate limit counts calls that
-- never finish) and filled in after it, which needs an update policy — scoped,
-- like every other policy here, to the caller's own rows.
drop policy if exists "ai_calls_update_own" on public.ai_calls;
create policy "ai_calls_update_own" on public.ai_calls
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
