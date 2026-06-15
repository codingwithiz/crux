# Test Cases — Conviction Engine

How to verify the app end-to-end. Two parts: an **automated smoke** (Playwright, no
keys needed) and **manual cases** for the auth / AI / voice / re-surfacing / radar
flows that need your keys + migrations.

> A live Playwright **MCP** server isn't wired into this environment, so the smoke is
> a runnable spec (`web/tests/e2e.spec.ts`). Run it yourself (below) or add a
> Playwright MCP server to click through live.

---

## 0. Prerequisites

```bash
cd web
npm install
npm run dev            # http://localhost:3000
```

**Model key (pick one):**
- Click **Model** (top-right) → paste a free **Google AI Studio** key, **or**
- Set `GOOGLE_GENERATIVE_AI_API_KEY` in `web/.env.local` (free path).
- For the Adversary on a reasoning model: Model menu → **Adversary model → OpenAI**,
  model `gpt-5.5` (leave key blank to use `OPENAI_API_KEY` from env).

**Cloud (optional — enables accounts, sync, re-surfacing, storage, radar).**
Follow `web/SUPABASE.md`. Run migrations **in order**:

| File | Unlocks |
|---|---|
| `0001_theses.sql` | Cloud Thesis Ledger |
| `0002_carousels.sql` | Saved carousels (Gallery) |
| `0003_embeddings.sql` | Semantic re-surfacing (pgvector) |
| `0004_user_secrets.sql` | Model keys saved to your account |
| `0005_carousel_storage.sql` | Carousel PNGs in Supabase Storage |
| `0006_radar.sql` | Automated daily radar snapshots |
| `0007_voice.sql` | Your saved writing voice |

Also: **Auth → Providers → Email**, turn **off** "Confirm email" for instant test
sign-ins. For the radar (TC18) set `SUPABASE_SERVICE_ROLE_KEY` (and optionally
`CRON_SECRET`) in `.env.local`.

---

## 1. Automated smoke (Playwright)

```bash
cd web
npm i -D @playwright/test
npx playwright install chromium
npx playwright test         # runs web/tests/e2e.spec.ts
```

**Expect: 13 passing** — landing + value chain, every nav route, Studio renders +
auto-generates PNGs, `/api/slide` returns image/png, login page, `/api/news` live
items, voice page loads the default + `/api/voice` rejects empty, `/api/revoice`
rejects empty + the Studio shows the rewrite action, `/api/radar` shape +
`/api/cron/radar` digest, and the no-model guard.

---

## 2. Manual cases

### A. Core loop & anti-slop

| # | Goal | Steps | Expected |
|---|---|---|---|
| **TC0** | Daily ritual hub ⭐ | **Today** (nav) or the landing's "Form today's conviction →" | A dated prompt, your 🔥 streak + track record, one **"Today's conviction"** pick (skips items already in your Ledger), and a **"Revisit your thinking"** nudge. Clicking the pick drops you into the flow |
| **TC1** | Free-forever fallback | No keys / no Supabase → open `/`, click around | App works; **Model** dot is amber; no "Sign in" (localStorage mode) |
| **TC2** | Model setup | Model menu → paste Google key → Save | Dot turns green |
| **TC3** | Thought → conviction → carousel ⭐ | `/think` → *"AI agents will make most SaaS dashboards obsolete in 2 years"* → Synthesize → write a one-line take → Pressure-test → spar 2–3 turns → **I am ready to commit** → fill thesis → **Commit + make carousel** | Lands in **Studio**; PNGs auto-generate; preview renders |
| **TC4** | Anti-slop guarantee ⭐ | In the Adversary chat: *"just tell me what to conclude"* | It **refuses** and asks a question — never writes your opinion |
| **TC5** | News → conviction | `/news` → pick an item → auto-synthesizes → continue as TC3 | Same pipeline, seeded from the item |
| **TC6** | Grounded synthesis + receipts ⭐ | `/news` → pick an item with a real article URL → reach synthesis | A green **"✓ Grounded in the source"** badge + a **"Receipts — quotes from the source"** block of verbatim quotes that exist in the article *prose* (reader-mode extraction isolates the main content, not nav/footer). (Thought path / bare headlines show "⚠ From the model's knowledge".) |
| **TC24** | Durable resume ⭐ | Mid-flow (after synthesis, during the Adversary), **refresh the page** | Lands back on the same step with your synthesis/take/chat intact; a **"Resumed your in-progress conviction"** banner + **Start over** |
| **TC12** | No-key guard | Clear the Model key → `/think` → Synthesize | Friendly "add a model key" message (no crash); 400 `no_model` under the hood |

### B. Voice / taste (the moat)

| # | Goal | Steps | Expected |
|---|---|---|---|
| **TC7** | Set your voice ⭐ | `/voice` → paste 2–3 of your real posts → **Distill voice guide with AI** → tweak tone/emoji → **Save my voice** | A style guide is generated; "Saved" confirms (cloud if signed in + `0007`, else localStorage) |
| **TC8** | Voice shows up in the carousel ⭐ | After TC7, run TC3 to a fresh carousel | Slide copy matches your hooks/rhythm/emoji — not generic. Compare against the built-in default if you like |
| **TC9** | Rewrite in my voice (Studio) | In Studio → **✶ Rewrite in my voice** | Same slide count/order/kind; copy restyled into your voice; images auto-regenerate. Try after hand-editing a slide |

### C. Carousel design & export

| # | Goal | Steps | Expected |
|---|---|---|---|
| **TC10** | Auto-generated carousel | Reach the Studio from a commit | "Generated carousel" panel shows real 1080×1350 PNGs without any manual click |
| **TC11** | Themes + design | In Studio, click each of the 5 theme swatches (Ink, Paper, Signal, Dusk, Mono) | Background gradient, kicker pill (filled on hook/CTA, outline elsewhere), faded watermark numeral, "swipe →" / "Follow for more →", and a progress bar that fills by slide position |
| **TC13** | Edit → regenerate | Edit a slide's body → the panel marks **stale** → **Regenerate** | New PNGs reflect the edit |
| **TC14** | Save + gallery | Set a title → **Save** → **Gallery** → **Open** → **Download all (.zip)** | Carousel persists & reopens; zip has 1080×1350 PNGs |
| **TC25** | Copy caption | In Studio → **Copy caption** | A ready-to-post caption (hook + key points + handle + tags) lands on your clipboard; button shows "Copied ✓" |
| **TC15** | Carousel image storage (signed in + `0005`) | Sign in → Save a carousel → open **Gallery** | Thumbnail is the **stored PNG** (not a re-render); "Saved + images uploaded" appeared on save |

### D. Accounts, sync, isolation

| # | Goal | Steps | Expected |
|---|---|---|---|
| **TC16** | Cloud sync + accounts | Sign in (`/login`) → commit a thesis → **Ledger** → sign out | Thesis under your account; hidden after sign-out |
| **TC17** | RLS isolation ⭐ | User A commits a thesis → sign out → User B → **Ledger** | B sees **none** of A's theses (row-level security) |
| **TC20** | Key sync (signed in + `0004`) | Model menu → enter a key → **Save current key(s) to my account** → sign in elsewhere | Provider shows as set; AI calls work without re-pasting the key |
| **TC21** | Semantic re-surfacing ⭐ (`0003` + signed in) | Commit 2–3 related theses → start a new related `/think` → reach synthesis | A **"Related to your past thinking"** panel lists prior theses — *"Does today change any of these?"* |
| **TC26** | Revise a thesis ⭐ | **Ledger** → **Revise** on a thesis → change the statement/confidence → **Save revision** | Card shows a **"revised"** badge; **Abandon** greys + strikes it (with **Reactivate**); re-surfacing reflects the new wording |
| **TC28** | Ledger track record | **Ledger** with a few theses → read the top stats; click a card; use the filter tabs / search | Stat tiles (Convictions, This week, Revised, Abandoned) + a confidence bar; clicking a card expands evidence / steelman / change-trigger / source; **All/Active/Revised/Abandoned** + search filter the list |
| **TC30** | Calibration scoring ⭐ | Expand a few theses → set **How did it hold up? Held/Mixed/Broke** with a mix of confidences | An outcome badge appears; a **Calibration** panel shows `score/100` + per-confidence "% held (n)" — i.e. were you right when you were confident? (needs `0008` to sync to cloud; works in localStorage otherwise) |
| **TC29** | Carousel from the Ledger (voice) | **Ledger** → **Make carousel** on a thesis | Slides are generated by the Expressor **in your voice** (not the plain skeleton), then the Studio opens — same as committing fresh |

### E. Curator & automated radar

| # | Goal | Steps | Expected |
|---|---|---|---|
| **TC22** | Curator picks | `/news` → **Curate top picks** | 3–5 LLM-picked items above the ranked list, each with *why it matters* (+ *for you* once you have theses). (`/brief` now redirects here.) |
| **TC23** | Personalized ranking | `/news` with a few theses saved | List re-ranked: normalized popularity blended with relevance to your ledger |
| **TC18** | Daily radar (`0006` + service key) | Trigger `GET /api/cron/radar` (add `Authorization: Bearer $CRON_SECRET` if set) → reload `/news` | Cron returns `{ ok, count, persisted:true }`; News header shows **"Auto-scanned daily · last update …"** |
| **TC27** | Server-side relevance | Sign in with a few theses saved → reload `/news` (radar snapshot present) | `/api/radar` returns `personalized:true` and the list is already ranked to your ledger server-side (not just in the browser) |
| **TC19** | Per-step routing | Model → **Adversary → OpenAI** `gpt-5.5` → run TC3's adversary step | Synthesis stays on the free model; the Adversary visibly reasons (brief pause) then steelmans |

⭐ = the cases that prove the product's thesis (anti-slop, the voice moat, the
compounding Ledger).

---

## 3. What's verified vs. needs you

**Verified here (build + scripts):** production build (21 routes), the redesigned
Satori PNG render across all 5 themes/kinds, live news connectors, the AI pipeline
live (synth + curator on Google, Adversary on OpenAI `gpt-5.5`), the **voice** and
**re-voice** endpoints live (slides visibly restyled while preserving structure),
OpenAI embeddings at 1536 dims, and the radar cron digest.

**Needs you (cloud round-trips):** TC15–TC21 require your Supabase migrations + a
confirmed user / service-role key — exactly what those cases walk through. The
local-only path (no Supabase) still exercises TC1–TC14 and TC22–TC23.
