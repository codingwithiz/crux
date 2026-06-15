# Conviction Engine — Status & Handoff

_Last updated: 2026-06-15. Read this top-to-bottom once; then use it as the map._

This is the single "where are we" document. For strategy see [PLAN.md](./PLAN.md),
for system design [ARCHITECTURE.md](./ARCHITECTURE.md), for setup
[web/SUPABASE.md](./web/SUPABASE.md) + [DEPLOY.md](./DEPLOY.md), and for the
hands-on test script [TEST_CASES.md](./TEST_CASES.md).

---

## 1. What this is (in one breath)

A **conviction engine**, not a content factory. It walks you along
**Information → Understanding → Insight → Opinion → Content** and owns the middle
nobody else does. The governing rule:

> **The AI is an adversary that makes _you_ think — never an author that writes
> your opinion.** You own two irreducible steps (form the view, commit to it);
> the AI does everything around them. A tool that hands you a finished take
> produces laundered slop.

The visible output is a **carousel** (IG/LinkedIn). The compounding assets (the
"moats") are your **Thesis Ledger**, your **voice**, and the **daily habit**.

**Status: feature-complete MVP, all green.** 25 commits, 10 screens, 12 API
routes, 8 SQL migrations, 15 automated tests passing, production build clean. It
runs **free** end-to-end (Google Gemini free tier + localStorage), with optional
paid upgrades (Claude on the Adversary, Supabase cloud sync, BYOK keys).

---

## 2. Run it in 2 minutes (so you can test tonight)

```bash
cd web
npm install
npm run dev            # http://localhost:3000
```

- Click **Model** (top-right) → paste a free **Google AI Studio** key
  (aistudio.google.com/app/apikey), or set `GOOGLE_GENERATIVE_AI_API_KEY` in
  `web/.env.local`. The dot turns green.
- That's enough for the whole local flow (Today → News/Think → Adversary →
  Commit → Carousel). Cloud accounts/sync are optional (see §7).

To run the automated tests:
```bash
cd web
npx playwright test    # 15 specs, no keys needed
```

---

## 3. What I built — the 25 commits, grouped

### Phase 0 — foundation (2026-06-14)
| Commit | What it delivered |
|---|---|
| `9c3d739` | The plan + Phase-0 no-code pilot kit. |
| `794d027` | Next.js app scaffold + **Carousel Studio** with free Satori PNG export. |
| `068505d` | **Thought → conviction flow**: synthesize → adversary → express. |
| `6c593bb` | **News → conviction** path + the **Thesis Ledger** screen. |
| `e40dac4` | **Per-step model routing** (Claude Opus 4.8 just for the Adversary). |
| `6431ec8` | **Supabase cloud Ledger** + multi-user auth (localStorage fallback). |
| `9629840` | **Cloud carousels**: save, gallery, reopen/edit/re-export. |
| `c2303b3` | ARCHITECTURE.md. |
| `c057d4d` | **Curator** — personalized Daily Brief. |
| `0c02614` | First-class **OpenAI reasoning** (gpt-5.5) on the Adversary; live-verified. |
| `22a308c` | **pgvector re-surfacing** (the moat) + E2E spec + test cases. |

### Phase 1 — breadth, security, polish (2026-06-15)
| Commit | What it delivered |
|---|---|
| `2cd7fee` | More sources (Reddit, Lobsters) + **normalized/personalized ranking**. |
| `3ec73d8` | gitignore Playwright artifacts. |
| `6bb6348` | **Secure per-user model keys** (server-side, RLS) — `0004`. |
| `5a52820` | **Auto-generate carousel images** on commit (not just open the editor). |
| `d1f6df5` | **Carousel image storage** (`0005`) + **automated daily radar** Cron (`0006`). |
| `2bf68dd` | **Voice/taste tuning** — carousels in _your_ voice (moat #2) — `0007`. |
| `a7998da` | Studio **"Rewrite in my voice"** (re-voice existing slides). |
| `855b56e` | **Carousel redesign** (5 themes, gradients, progress bar) + doc refresh. |

### Phase 2 — close the gaps, deepen the moats (2026-06-15)
| Commit | What it delivered |
|---|---|
| `971b001` | **5 audit gaps**: grounded synthesis+citations, durable resume, revise-thesis, server-side radar relevance, copy-caption + DEPLOY.md. |
| `b4ed773` | **Deeper Ledger** (track record, filters, expandable detail) + voice carousels from the Ledger. |
| `8092a85` | **Today ritual hub** — the daily habit loop (moat #3). |
| `4022ea8` | **Grounding reader-mode** — isolate article prose for better citations. |
| `48acb31` | **Calibration scoring** — keep score on your convictions (`0008`). |
| `adb6cb9` | **Consolidate Brief + News** into one Browse surface. |

---

## 4. How the system is meant to work (the user journey)

```
        ┌──────────────────── Thesis Ledger (your moat) ─────────────────────┐
        │  committed opinions · evidence · confidence · outcomes · re-surface  │
        └───────▲───────────────────────────────────────────────▲────────────┘
   pick one     │ (re-surfaces related theses)                    │ commit
  ┌──────────┐  │   ┌─────────────┐   ┌────────────────────┐      │   ┌──────────┐
  │  INPUT   │──┴──▶│ SYNTHESIZER │──▶│ ADVERSARY (you spar)│──────┴──▶│ EXPRESSOR│
  │news│thought│    └─────────────┘   └────────────────────┘          └──────────┘
  └──────────┘     grounded + cites    refuses to conclude            your voice → carousel
```

**The screens, in the order you'd use them:**

1. **`/today`** — the daily ritual. Your 🔥 streak + track record, **one** curated
   "form today's conviction" pick (skips items you've already opined on), and a
   "revisit your thinking" nudge on your oldest active thesis. This is the front
   door (also the landing-page CTA).
2. **`/news`** — explore the firehose. The full ranked list (free, instant) plus
   optional **"Curate top picks"** (the AI Curator, 3–5 items + why-it-matters).
   _(The old `/brief` redirects here.)_
3. **`/think`** — start from your own rough opinion instead of the news.
4. **The flow itself** (`ConvictionFlow`): **Synthesize** (grounded breakdown +
   a "✓ Grounded in the source" badge + verbatim **Receipts** quotes for news) →
   you write a one-line take → **Adversary** (streamed Socratic/steelman chat that
   **refuses** to conclude for you) → **Commit** (statement + confidence +
   evidence + steelman + "what would change my mind"). The whole flow **survives a
   refresh** (resume banner).
5. **`/studio`** — the carousel auto-generates as real 1080×1350 PNGs in your
   voice. Pick a theme (5), edit copy, **Rewrite in my voice**, **Copy caption**,
   **Download all (.zip)**, **Save**.
6. **`/gallery`** — saved carousels (real stored images when signed in).
7. **`/ledger`** — your track record: stats + streak + **calibration score**,
   filters/search, expandable cards, **Revise**/**Abandon**, mark **outcomes**
   (held/mixed/broke), and **Make carousel** (voice-tuned) from any past thesis.
8. **`/voice`** — paste your real posts, **distill** a style guide with AI, set
   tone/emoji. Every carousel then sounds like you. (A strong built-in default
   ships out of the box.)
9. **`/login`** — optional email account for cloud sync.

---

## 5. The code, explained

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · Vercel
AI SDK v6 · `next/og` (Satori) · Supabase (Auth + Postgres + RLS) · Playwright.

### API routes (`web/app/api/*`) — the server
| Route | Job |
|---|---|
| `synthesize` | Grounded breakdown. For news it **fetches the real source** (`lib/extract.ts`, reader-mode) and synthesizes only from it, returning verbatim `citations` + a `grounded` flag. |
| `adversary` | Streams the Socratic/steelman chat (`streamText` + `useChat`). The "refuse to conclude" rule lives in `ADVERSARY_SYSTEM`. |
| `express` | Thesis → carousel slides, tuned by your `voice`. |
| `revoice` | Rewrite existing slides in your voice, preserving count/order/meaning. |
| `voice` | Distill writing samples into a reusable style guide. |
| `brief` | Curator: pick the 3–5 items most worth an opinion. |
| `news` / `radar` / `cron/radar` | Live sources / latest daily snapshot (ranked server-side to your ledger) / the daily Cron scan. |
| `embed` | OpenAI embeddings (1536-dim) for re-surfacing. |
| `secrets` | Per-user model keys (booleans out, never values). |
| `slide` | Satori → 1080×1350 PNG of one slide. |

### Library (`web/lib/*`) — the logic
- `ai/model.ts` — provider switch (Gemini free → Ollama → Anthropic/OpenAI BYOK).
- `ai/routing.ts` — **per-step** routing (Adversary can use a stronger model).
- `ai/prompts.ts` — all system prompts (Synthesizer, **grounded** synthesizer,
  Adversary, Expressor, re-voice, voice-distill, Curator).
- `ai/server-settings.ts` — merges a signed-in user's saved keys per request.
- `ai/voice-prompt.ts` — composes the voice guide+samples block.
- `extract.ts` — **reader-mode** retrieval: isolates `<article>`/`<main>` prose,
  drops nav/footer, grabs title+meta. The anti-hallucination half of grounding.
- `sources.ts` — 6 free connectors (HF, HN, GitHub, Reddit, Lobsters).
- `rank.ts` — per-source min-max normalized popularity blended with keyword
  relevance to your theses.
- `ledger.ts` — the Thesis Ledger, **dual-mode** (Supabase when signed in,
  localStorage otherwise) behind one async interface; `addThesis` / `updateThesis`
  (re-embeds) / `removeThesis`.
- `ledger-stats.ts` — pure track-record stats, `dailyStreak`, and **`calibration`**
  (Brier-style score + per-confidence hit rate).
- `related.ts` — pgvector re-surfacing (`match_theses` RPC).
- `voice.ts` — your voice profile (dual-mode) + the built-in default.
- `express-client.ts` — shared voice-tuned `expressSlides()` (commit flow + Ledger).
- `flow-session.ts` — persists the in-progress conviction → **durable resume**.
- `slides.ts` / `slide-render.tsx` — carousel data + the **one** Satori component
  that renders identically as live preview and server PNG; `buildCaption`.
- `carousels.ts` — saved carousels + Supabase Storage upload (dual-mode).
- `supabase/{client,server}.ts` — browser + server clients (+ service-role for Cron).

### Components (`web/components/*`) — the UI
`ConvictionFlow` (the state machine) · `TodayView` · `BrowseView` (news+curate) ·
`CarouselStudio` · `GalleryView` · `LedgerView` · `VoiceEditor` · `Nav` ·
`SettingsButton` · `AuthButton`.

### Security model (important)
The browser talks to Supabase **directly** with the public anon key. What stops
user A reading user B's data is **Postgres Row-Level Security** — every table has
`using (auth.uid() = user_id)` policies, so every query is silently filtered to
the signed-in user. The service-role key (Cron only) is server-side and never
shipped to the browser. The 8 migrations each set this up.

---

## 6. Done vs. Not done

### ✅ Done (and verified)
- Full pipeline both inputs (news + thought) → carousel.
- Adversary refuses to conclude (anti-slop) — the core stance.
- **Grounded synthesis** with reader-mode retrieval + verbatim citations
  (verified live: exact quotes from real arXiv/HN pages).
- Thesis Ledger: cloud+local, pgvector re-surfacing, revise/abandon, **outcomes +
  calibration**, track record + streak, filters/search.
- **Voice**: Expressor writes in your voice; re-voice any deck; AI-distilled guide.
- **Carousel**: auto-generated PNGs, 5-theme redesign, image storage, copy-caption.
- **Today** daily ritual (habit loop).
- Curator: ranked sources + AI picks + automated daily radar (Cron, server-ranked).
- Multi-user auth + RLS; secure per-user key sync; free-forever + BYOK.
- **Durable resume** (survives refresh/crash, session-level).
- 15 automated tests; production build clean (25 routes); `DEPLOY.md` (Vercel-ready).

### ❌ Not done — **deferred, but genuinely buildable**
- **Durable-workflow engine** (Inngest / Vercel Workflow) — survives _server_
  crashes, not just client refresh. Needs an external service/account, so it's
  **waiting on your go-ahead** to pick one.
- **Calibration over time** — currently a snapshot; a trend line as more theses
  resolve would be richer.
- **First-run onboarding** nudge (set a key / set your voice).

### 🚫 Not done — **by design (recommend NOT building)**
These would contradict the plan's reframe:
- **Auto-posting / scheduling** — the slop trap (PLAN A6/A8). Human-in-the-loop is
  the point; **Copy caption** covers manual posting.
- **Global knowledge graph** — deliberately killed in favor of the personal Ledger.
- **Opportunity detection** — needs usage data you won't have early.

---

## 7. Testing — what's automated, what's on you

### Automated (no keys needed) — run `npx playwright test` in `web/`
**15 specs, all passing.** They cover: landing + value chain, every nav route,
Studio renders + auto-generates PNGs, `/api/slide` PNG, the News page
(curate + ranked list + `/brief` redirect), the Today hub (prompt + streak),
the Voice page + `/api/voice` guard, `/api/revoice` guard + Studio actions,
`/api/radar` shape + the Cron digest, login page, `/api/news` live items, and the
no-model guard. The AI pipeline, voice, re-voice, grounding, and radar were also
**verified live** during development (real model calls + real source fetches).

### Manual (your script) — [TEST_CASES.md](./TEST_CASES.md)
**31 cases (TC0–TC30)**, grouped: core loop & anti-slop · voice/taste ·
carousel design & export · accounts/RLS/sync · curator & radar. The ⭐ ones prove
the thesis. Start with these when you're home:
- **TC0** — the Today ritual hub.
- **TC3** — thought → conviction → carousel (the core loop).
- **TC4** — anti-slop: tell the Adversary "just tell me what to conclude" → it
  must refuse.
- **TC6** — grounded synthesis: pick a news item with a real URL → "✓ Grounded"
  badge + verbatim **Receipts**.
- **TC8/TC9** — your voice in the carousel + "Rewrite in my voice".
- **TC30** — calibration: resolve a few theses (held/mixed/broke) → the score.

### Cloud prerequisites (only for the sync/storage/radar cases)
Follow `web/SUPABASE.md`: set `NEXT_PUBLIC_SUPABASE_URL` + `..._ANON_KEY`, run
migrations **`0001`–`0008`** in order, turn **off** "Confirm email" for instant
test sign-ins. For the radar's persistence add `SUPABASE_SERVICE_ROLE_KEY` (+
optionally `CRON_SECRET`). You said you've run the SQL through `0007`; **`0008`**
(calibration outcomes) is the only new one to run.

---

## 8. Honest limitations (so nothing surprises you)
- **Grounding depth varies by page.** Reader-mode is regex-based (no headless
  browser). Server-rendered articles (arXiv, most blogs) extract cleanly;
  heavily JS-rendered pages may yield thinner text and fall back to title+summary.
- **Reddit** often returns 0 items from datacenter IPs (rate-limited) — handled
  gracefully; the other 5 sources cover it.
- **Calibration is self-scored** — you mark the outcomes; it's a discipline aid,
  not an oracle.
- **Durable resume is client-side** — a hard server crash mid-stream isn't
  checkpointed (that's the deferred workflow engine).
- **Confirm-email ON** in Supabase blocks instant programmatic sign-ups — turn it
  off for testing.

---

## 9. Where to go next (my recommendation)
1. **You decide:** the durable-workflow engine — tell me **Inngest** or **Vercel
   Workflow** and I'll scaffold it.
2. Otherwise: **calibration-over-time** (a trend as theses resolve) is the next
   self-contained, plan-aligned win.
3. Then: a **Vercel deploy** (per `DEPLOY.md`) to get a shareable URL — the
   public artifact _is_ the marketing (PLAN A7).

Everything is committed, builds clean, and has a test. Enjoy work — it'll all be
here when you're back.
