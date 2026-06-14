# Cloud setup (Supabase) — Thesis Ledger sync + accounts

The app runs **without** Supabase (the Thesis Ledger lives in your browser's
localStorage). Add Supabase to get **multi-user accounts** and a **cloud ledger
that syncs across devices**, with per-user isolation enforced by row-level
security.

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
```
Restart `npm run dev` after adding them.

## 3. Create the table
Open **SQL Editor** in the Supabase dashboard, paste the contents of
[`supabase/migrations/0001_theses.sql`](./supabase/migrations/0001_theses.sql),
and run it. This creates the `theses` table and the row-level-security policies
(each user can only read/write their own theses). Then run
[`supabase/migrations/0002_carousels.sql`](./supabase/migrations/0002_carousels.sql)
the same way to enable **saved carousels** (the Gallery). Finally run
[`supabase/migrations/0003_embeddings.sql`](./supabase/migrations/0003_embeddings.sql)
to enable **semantic re-surfacing** (pgvector). Re-surfacing needs an OpenAI key
for embeddings — set `OPENAI_API_KEY` in `.env.local`, or an OpenAI key in the
Model menu. Theses committed *before* this migration won't have embeddings until
re-committed.

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

## Notes
- The `anon` key is safe to expose in the browser — RLS is what protects data.
  Never put the **service_role** key in the app.
- Deploying to Vercel: add the same two `NEXT_PUBLIC_*` vars in the Vercel
  project's Environment Variables.
- Carousel image storage (Supabase Storage) is not wired yet — carousels still
  download locally. That's an easy follow-up once accounts are in.
