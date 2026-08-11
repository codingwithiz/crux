# Deploy — Crux (Vercel)

The app is deploy-ready: it builds clean, ships a `vercel.json` (daily-radar Cron),
and runs **free** on Vercel Hobby. The project root for the app is `web/`.

## Option A — Vercel CLI (one command)

```bash
npm i -g vercel
cd web
vercel            # first run: link/create the project, set root to ./web
vercel --prod     # promote to production
```

## Option B — GitHub → Vercel

1. Push this repo to GitHub.
2. In Vercel → **New Project** → import the repo.
3. Set **Root Directory = `web`** (Next.js auto-detected; build `next build`).
4. Add env vars (below) → **Deploy**.

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production +
Preview). All are optional — with none set, the app still runs in free/localStorage
mode, but cloud features and server keys need them.

| Var | Enables |
|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Free default model (server-side) |
| `OPENAI_API_KEY` | Default model + embeddings (re-surfacing) |
| `ANTHROPIC_API_KEY` | Claude Adversary upgrade |
| `OLLAMA_BASE_URL` | Local-model endpoint (server-side only) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Accounts, cloud ledger, gallery, voice |
| `SUPABASE_SERVICE_ROLE_KEY` | Daily-radar Cron writes (server only) |
| `CRON_SECRET` | **Required.** Gates `/api/cron/radar`, which refuses to run when it is unset |

Model keys are server-side only — users never supply their own.

Run the SQL migrations in `web/supabase/migrations/0001…0010` once in the Supabase
SQL editor (see [`web/SUPABASE.md`](./web/SUPABASE.md)). Apply 0010 **before**
deploying the code that writes `theses.synthesis`, or committing a thesis fails.

## Cron

`web/vercel.json` declares a daily job hitting `/api/cron/radar` at 13:00 UTC.
Vercel runs it automatically once deployed; set `CRON_SECRET` so only the Cron can
trigger it. No Cron is needed for the rest of the app (it's on-demand).

## Verify after deploy

- Open the URL → landing renders; nav routes resolve.
- `GET /api/news` returns live items; `/api/slide?d=…` returns a PNG.
- With a model key set: `/think` runs the full pipeline to a carousel.
- (Cloud) sign up at `/login`, commit a thesis, see it in `/ledger`.

## Notes

- **Not** wired: auto-posting/scheduling — intentionally (human-in-the-loop; see
  PLAN A6/A8). The Studio's **Copy caption** gets you a ready-to-paste post.
- Free-forever floor holds on Hobby: Gemini free tier + Supabase free + Vercel
  Hobby = `$0`. Model calls run on the deployment's own provider key — there is no bring-your-own-key.
