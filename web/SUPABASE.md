# Cloud setup (Supabase) — accounts + track-record sync

The app runs **without** Supabase: your track record lives in this browser's
local storage and every page is open. That's the supported way to try it
locally.

Add Supabase and two things change together: you get **accounts** and
cross-device sync, and **every page becomes login-only** — the proxy gates the
app and each API route checks the session, because those routes spend the
deployment's own provider key. There is no configuration in between.

## 1. Create a Supabase project
1. Sign up at https://supabase.com and create a new project (free tier is fine).
2. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Add env vars
Create `web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY

# Optional — only needed for the automated daily radar (step 7):
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY   # server-only; never expose
CRON_SECRET=any-long-random-string                # gates /api/cron/radar
```
Restart `npm run dev` after adding them. The **service-role key** is found in
**Project Settings → API**; it bypasses row-level security, so keep it server-side
only (it is never sent to the browser).

## 3. Create the table
Open **SQL Editor** in the Supabase dashboard, paste the contents of
[`supabase/migrations/0001_theses.sql`](./supabase/migrations/0001_theses.sql),
and run it. This creates the `theses` table and the row-level-security policies
(each user can only read/write their own theses). Then run
[`supabase/migrations/0002_carousels.sql`](./supabase/migrations/0002_carousels.sql)
the same way to enable **saved carousels** (the Gallery). Finally run
[`supabase/migrations/0003_embeddings.sql`](./supabase/migrations/0003_embeddings.sql)
to enable **semantic re-surfacing** (pgvector). Re-surfacing needs an OpenAI key
for embeddings — set `OPENAI_API_KEY` in `.env.local`. Theses committed *before*
this migration won't have embeddings until re-committed.

Skip `0004_user_secrets.sql`: users no longer bring their own model keys, and
[`0009_drop_secrets_add_ai_calls.sql`](./supabase/migrations/0009_drop_secrets_add_ai_calls.sql)
drops that table. Run 0009 last — it also creates `ai_calls`, which meters model
usage and backs the per-user hourly rate limit. Until it is applied the limit
does not bite (the count query finds no table), so apply it before exposing the
app to anyone else.

Then run
[`supabase/migrations/0005_carousel_storage.sql`](./supabase/migrations/0005_carousel_storage.sql)
to enable **saved carousel images** (Supabase Storage). It creates a public
`carousels` bucket plus storage policies so a signed-in user can write only under
their own folder. After this, hitting **Save** in the Studio uploads the rendered
PNGs and the **Gallery** shows the real stored images (and zips them straight from
Storage). Without it, saving still works — the Gallery just re-renders thumbnails
on demand.

Finally, run
[`supabase/migrations/0007_voice.sql`](./supabase/migrations/0007_voice.sql)
to enable **your saved writing voice** (the `user_voice` table, own-row RLS).
The **Voice** page lets a signed-in user paste their real posts, distill them
into a style guide, and have every carousel written in *their* voice. Without
this migration the voice still works — it just lives in `localStorage` instead
of syncing to the account. Out of the box a strong built-in default voice is
used, so carousels are never generic even before you set your own.

Optionally run
[`supabase/migrations/0008_thesis_outcome.sql`](./supabase/migrations/0008_thesis_outcome.sql)
to enable **calibration scoring** — it adds `outcome`/`resolved_at` to `theses` so
the Ledger can score how well your stated confidence matched reality. Works in
localStorage mode without it; only cloud sync of outcomes needs the column.

Then run
[`supabase/migrations/0010_thesis_synthesis.sql`](./supabase/migrations/0010_thesis_synthesis.sql)
to **persist the synthesis** each thesis was built on — its source and verified
quotes. Without it, a carousel made from the Ledger later has no source context
and is silently ungrounded. **Apply this one before deploying the code that
writes the column**: `addThesis` inserts `synthesis`, and against a database
without it Postgres rejects the whole insert, so committing a thesis fails.

## 4. Enable email auth
In **Authentication → Providers**, ensure **Email** is enabled. For quick local
testing you can turn **off** "Confirm email" (Authentication → Providers → Email)
so sign-ups work without the confirmation step.

## 5. Use it
- Run the app, click **Sign in** (top-right) → create an account → sign in.
- New committed theses now save to Supabase under your user; the **Ledger**
  screen reads them back. Sign out and they're hidden; another user sees only
  their own.
- Not signed in (or Supabase not configured) → the ledger silently uses
  localStorage, so nothing breaks.

## 6. Automated daily radar (optional)
Run
[`supabase/migrations/0006_radar.sql`](./supabase/migrations/0006_radar.sql)
to create the `radar_snapshots` table (public-read). A **Vercel Cron** job
(declared in [`vercel.json`](./vercel.json), daily at 13:00 UTC) calls
`/api/cron/radar`, which scans the free AI sources, ranks them by normalized
popularity, and stores one snapshot. The **News** page reads the latest snapshot
so a prepared brief is always waiting (your per-thesis relevance ranking is still
applied in the browser); if no snapshot exists it falls back to a live scan.
- Writes use the **service-role key** (`SUPABASE_SERVICE_ROLE_KEY`) because the
  Cron has no user session. Without it the route still returns the computed
  digest but doesn't persist (`persisted: false`).
- Set `CRON_SECRET` in production — Vercel sends it as a bearer token so only the
  Cron can trigger the scan. Locally (no secret) the route is open for testing.
- To trigger a scan by hand: `GET /api/cron/radar` (add
  `Authorization: Bearer $CRON_SECRET` if you set one).

## Notes
- The `anon` key is safe to expose in the browser — RLS is what protects data.
  Never put the **service_role** key in the app (server/env only).
- Deploying to Vercel: add the same `NEXT_PUBLIC_*` vars, plus
  `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` if you want the daily radar, in
  the Vercel project's Environment Variables. The Cron in `vercel.json` runs
  automatically once deployed.
## Migrations — apply all of them, in order

Run every file in `supabase/migrations/` in the SQL editor, oldest first. They
are not optional extras: **0009 and 0012 each close a real data-exposure bug**,
and a deployment that stops before them is worse than one with no cloud sync at
all.

| # | What it does | If you skip it |
| --- | --- | --- |
| `0001` | theses | nothing works |
| `0002` | carousels | decks don't sync |
| `0003` | embeddings (pgvector) | no "related to your past thinking" |
| `0004` | user secrets | superseded — **dropped by 0009** |
| `0005` | carousel storage bucket | exported PNGs don't persist |
| `0006` | radar snapshots | the daily scan can't store anything |
| `0007` | user voice | saving your voice fails |
| `0008` | thesis outcomes | you can't score a take, so accuracy never computes |
| `0009` | **drops `user_secrets`**, adds `ai_calls` | provider keys stay in a plaintext table, and the hourly rate limit doesn't bite |
| `0010` | `theses.synthesis` | **saving a take fails outright** |
| `0011` | `user_voice.interests` | **saving your voice fails outright** |
| `0012` | scopes storage reads to the owner | **every user's rendered slides are publicly enumerable** |
| `0013` | widens `ai_calls` (tokens/cost/latency/errors) | cost tracking records nothing |

Apply `0010`, `0011` and `0013` *before* deploying the code that writes them —
Postgres rejects the whole insert on an unknown column, so the affected action
fails rather than degrading.
