# Architecture — Conviction Engine

A reference for how the system is built. For the *why* (strategy, market, decisions) see [PLAN.md](./PLAN.md); for setup see [README.md](./README.md) and [web/SUPABASE.md](./web/SUPABASE.md).

---

## 1. The concept (one paragraph)

This is **not** a content factory. It's a **conviction engine** that walks you along a value chain — **Information → Understanding → Insight → Opinion → Content** — and owns the *middle* that nobody else does. One principle drives every decision:

> **The AI is an adversary that makes *you* think — never an author that writes your opinion.** The human owns two irreducible steps (form the view, commit to it); the AI does everything around them. A tool that hands you a finished take produces laundered slop.

---

## 2. High-level architecture

The UI is **client-first**. The browser talks to two backends: our **own Next.js routes** (AI + image rendering, where model keys flow) and **Supabase directly** (auth + data, made safe by row-level security).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ BROWSER  — React client components                                             │
│   ConvictionFlow · TodayView · BrowseView · CarouselStudio · GalleryView ·     │
│   LedgerView · VoiceEditor                                                      │
│   SettingsButton · AuthButton · /login                                         │
│   STATE: React + localStorage (settings, draft, offline data) + SB session     │
└───────────────┬───────────────────────────────────────────┬───────────────────┘
        fetch() / useChat()                          @supabase/supabase-js
                │                                             │  (auth + data, direct)
                ▼                                             ▼
┌───────────────────────────────────────────┐    ┌──────────────────────────────┐
│ NEXT.JS SERVER  — route handlers + proxy   │    │ SUPABASE                     │
│   /api/synthesize   → Synthesizer          │    │   Auth (email / password)    │
│   /api/adversary    → Adversary (streaming)│    │   Postgres (+ RLS):          │
│   /api/express      → Expressor (voice)    │    │     theses (+ embeddings)    │
│   /api/revoice      → restyle slides       │    │     carousels (+ image_urls) │
│   /api/voice        → distill style guide  │    │     user_secrets · user_voice│
│   /api/brief        → Curator picks        │    │     radar_snapshots          │
│   /api/embed        → OpenAI embeddings    │    │   Storage: carousels bucket  │
│   /api/news · /api/radar → sources/radar   │    └──────────────────────────────┘
│   /api/cron/radar   → daily scan (Cron)    │
│   /api/secrets      → per-user model keys  │
│   /api/slide        → Satori → PNG         │
│   proxy.ts          → refresh auth session │
└───────────────┬───────────────────────────┘
       Vercel AI SDK v6  (per-step model routing)
                │
                ▼
┌───────────────────────────────────────────┐    ┌──────────────────────────────┐
│ MODEL LAYER  lib/ai/{model,routing,prompts}│    │ FREE SOURCES (server-fetched)│
│   Gemini (free) · Ollama · Anthropic · GPT │    │   HF Papers · HN · GitHub    │
└───────────────────────────────────────────┘    └──────────────────────────────┘
```

---

## 3. The pipeline: one engine, two inputs

```
INPUT ─▶ SYNTHESIZER ─▶ ADVERSARY (human-in-the-loop) ─▶ COMMIT ─▶ LEDGER
 news│thought   grounded breakdown   Socratic/steelman;          │      (the moat)
                                     refuses to conclude          ▼
                                                              EXPRESSOR ─▶ CAROUSEL (Satori PNG)
```

Both **`/think`** (your raw thought) and **`/news`** (a trending item) feed the *same* Synthesize → Adversary → Commit → Express pipeline.

## 4. Components → "agents"

The plan's agent design is deliberately **not** a multi-agent swarm — it's a pipeline of focused functions plus **one** genuinely-agentic loop.

| Concept | Implementation | Type |
|---|---|---|
| **Curator** | `BrowseView` + `lib/sources.ts` + `lib/rank.ts` + `/api/news`; `/api/brief` (LLM picks, the "Curated for you" section); `/api/cron/radar` + `/api/radar` (automated daily scan); `TodayView` surfaces one pick | Deterministic fetch/rank + one LLM call |
| **Synthesizer** | `/api/synthesize` → `generateText` + `Output.object` | One structured LLM call |
| **Adversary** | `/api/adversary` → `streamText` + `useChat` | **Agentic, human-in-the-loop** |
| **Expressor** | `/api/express` → `generateText` + `Output.object`, tuned by the user's **voice** (`lib/voice.ts`, `/api/voice` distiller); `/api/revoice` restyles existing slides | One structured LLM call |
| **Thesis Ledger** | `lib/ledger.ts` → Supabase / localStorage; `lib/related.ts` → pgvector re-surfacing | Memory (the moat) |
| (render) | `/api/slide` → `next/og` (Satori); PNGs optionally persisted to Supabase Storage | Pure transform |

---

## 5. Lifecycle of one conviction (thought path)

```
ConvictionFlow.tsx  (client state machine: input → synth → adversary → commit)
 1. type thought ──POST /api/synthesize {input, settings}
       server: stepModelSettings(…, "synthesize") → free model
               generateText + Output.object(SynthesisSchema) → grounded JSON
 2. read synthesis → write a one-line gut take
 3. useChat → /api/adversary  (DefaultChatTransport body: synthesis + take + settings)
       server: stepModelSettings(…, "adversary") → Claude Opus 4.8 (if configured)
               streamText(ADVERSARY_SYSTEM).toUIMessageStreamResponse()   [streamed]
       client renders message.parts as they arrive; spar 2–3 rounds
 4. COMMIT (the human step):
       build Thesis → addThesis()  ── Supabase insert (RLS) OR localStorage
       POST /api/express {thesis} → Slide[]   (Expressor, in your voice)
       saveDraft(slides) → router.push("/studio")
 5. Studio: SlideArt previews (client, scaled); Save → saveCarousel() (cloud/local)
       Download → per slide: fetch /api/slide?d=<payload> → PNG → JSZip
```

The **news path** is identical except `NewsPicker` supplies the input from `/api/news` and auto-runs step 1.

---

## 6. Data model (`web/lib/types.ts`)

`Settings` (provider/key/model + optional **adversary** override) · `Synthesis` (happened, newVsRepackaged, keyDebate, skepticCase, implications[], questions[]) · `Thesis` (statement, confidence, evidenceFor, steelman, changeMyMind, source, status, createdAt) · `Slide` (kind, kicker, title, body) · `Carousel` (title, slides[], themeId, handle, **imageUrls?**) · `NewsItem` / `BriefPick` (whyItMatters, relevance) · `VoiceProfile` (samples[], guide?, tone?, emoji) · `CarouselTheme` (+ `bg2` gradient).

---

## 7. Data layer — dual-mode + row-level security

### 7.1 Cloud-or-local (graceful degradation)
Every function in `lib/ledger.ts` and `lib/carousels.ts` is **async and works two ways behind one interface**:

```
getLedger() →  currentUserId()?  ── yes ──▶ Supabase (RLS-scoped to that user)
                                  ── no  ──▶ localStorage
```

So the app **never breaks**: no Supabase keys → localStorage; keys but signed out → localStorage; signed in → cloud. Cost: the interface is async (rippling into the components), and rows need snake_case↔camelCase mapping (`evidence_for ↔ evidenceFor`).

### 7.2 Security = Postgres RLS, not a server gate
The browser queries Supabase **directly** with the public `anon` key. What stops user A reading user B's data? **The database enforces it:**

```sql
alter table public.theses enable row level security;
create policy "theses_select_own" on public.theses for select using (auth.uid() = user_id);
create policy "theses_insert_own" on public.theses for insert with check (auth.uid() = user_id);
-- + update / delete, same shape; same pattern for carousels
```

`auth.uid()` comes from the signed-in user's JWT (cookie, refreshed by `proxy.ts`). Every query is silently filtered to `where auth.uid() = user_id`; you can't forge `user_id` or read anyone else's rows. **This is why a direct-from-browser data layer is safe** — the trust boundary lives in Postgres. `on delete cascade` cleans up a user's data with their account.

Migrations: `0001_theses` · `0002_carousels` · `0003_embeddings` (pgvector + `match_theses`) · `0004_user_secrets` · `0005_carousel_storage` (bucket + `image_urls`) · `0006_radar` · `0007_voice` · `0008_thesis_outcome` (calibration) — all in `web/supabase/migrations/`, each with own-row RLS. The radar snapshot is the one public-read table (its sources are public; writes come from the Cron via the service-role key).

---

## 8. Model layer — providers + per-step routing

`lib/ai/model.ts` is a provider switch (Vercel AI SDK v6): **Google Gemini (free)** default → **Ollama** (local) → **Anthropic / OpenAI** (BYOK). A per-request `apiKey` from the browser overrides the server env var.

`lib/ai/routing.ts`'s `stepModelSettings(settings, step)` routes **per pipeline step**: synthesis + express stay on the free default; the **Adversary** can use **Claude Opus 4.8** when configured. This keeps the platform free-forever while Claude is an opt-in quality upgrade on the one reasoning-critical step.

Prompts live in `lib/ai/prompts.ts` — notably `ADVERSARY_SYSTEM`, the prompt-engineering constraint that makes the model refuse to conclude for you (the philosophical crux, not a code feature).

---

## 9. Rendering — one component, two runtimes

`SlideArt` (`lib/slide-render.tsx`) renders **identically** in the browser (live preview, CSS-scaled) and on the server (`next/og` → real 1080×1350 PNG via `/api/slide`). That WYSIWYG only works because it's written in Satori's **flexbox-only** subset with inline styles (gradients, a kicker pill, a faded watermark numeral, and a per-position progress bar — all flexbox-safe), and the slide payload is JSON-encoded into a GET param. We store **slide data** (carousels stay editable + re-exportable) and, for signed-in users, **also** persist the rendered PNGs to Supabase Storage so the Gallery shows real images.

---

## 10. Auth & session
`@supabase/ssr`: a browser client (`lib/supabase/client.ts`) and `proxy.ts` (Next 16's renamed middleware) that refreshes the session cookie on navigation. `/login` does email/password sign-up/in; `AuthButton` shows state in the nav. All of it **no-ops without Supabase env vars** (localStorage mode).

---

## 11. The complex parts (ranked)

1. **Dual-mode data layer** (§7.1) — one async interface, cloud-or-local, never breaks. Elegant to describe, fiddly to wire everywhere.
2. **RLS security model** (§7.2) — browser queries the DB directly; Postgres enforces per-user isolation.
3. **The Adversary loop** — AI SDK v6 streaming `useChat` (transport, `message.parts`, async `convertToModelMessages`) **+** the "refuse to conclude" prompt constraint.
4. **Per-step model routing** (§8) — different model per step; free floor + BYOK premium.
5. **Satori shared-component rendering** (§9) — same component, browser preview + server PNG.
6. **Framework-version surface** — Next 16 (`middleware`→`proxy`, async `cookies()`/`searchParams`) and AI SDK v6 (`generateObject`→`generateText`+`Output.object`).

---

## 12. File map (`web/`)

```
app/
  page.tsx                  landing (value chain + entry cards)
  today/ news/ think/ studio/ ledger/ gallery/ voice/ guide/ login/   page routes
  brief/   → redirects to /news (Brief consolidated into News)
  api/synthesize|adversary|express/route.ts        the engine (LLM; synthesize = grounded + plainEnglish)
  api/commit-suggest/route.ts                       drafts the commit fields from your discussion
  api/revoice|voice/route.ts                        voice: restyle slides / distill guide
  api/brief|news|radar/route.ts                     curator: picks / sources (HN·HF·GitHub·Reddit·Lobsters·arXiv·RSS) / snapshot
  api/cron/radar/route.ts                           daily scan (Vercel Cron)
  api/secrets/route.ts                              per-user model keys
  api/embed/route.ts                                OpenAI embeddings (re-surfacing)
  api/slide/route.tsx                               Satori PNG render
components/
  ConvictionFlow.tsx        the input→synth→adversary→commit state machine
  TodayView.tsx  BrowseView.tsx  CarouselStudio.tsx  GalleryView.tsx  LedgerView.tsx
  VoiceEditor.tsx  Nav.tsx  SettingsButton.tsx  AuthButton.tsx
lib/
  types.ts                  shared types
  ai/model.ts  ai/routing.ts  ai/prompts.ts  ai/server-settings.ts  ai/voice-prompt.ts
  sources.ts  rank.ts        sources (HF/HN/GitHub/Reddit/Lobsters) + personalized ranking
  slides.ts  slide-render.tsx  draft.ts             carousel data + render (5 themes)
  ledger.ts  carousels.ts  voice.ts  related.ts     dual-mode data layer + re-surfacing
  settings.ts  supabase/client.ts  supabase/server.ts
proxy.ts                    session refresh
vercel.json                 daily radar Cron schedule
supabase/migrations/000{1..8}_*.sql   theses · carousels · embeddings · secrets · storage · radar · voice · outcomes (RLS)
```

---

## 13. Tech stack
Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · **Vercel AI SDK v6** · **`next/og` (Satori)** · **Supabase** (Auth + Postgres + RLS) via `@supabase/ssr` · `jszip` · `nanoid`.

## 14. Free-forever + BYOK
Default path costs **$0** (Gemini free tier / Ollama, localStorage, Vercel Hobby). Optional paid upgrades: **Claude** on the Adversary (~pennies/conviction), **Supabase** cloud sync (free tier), your own model keys. The free floor never disappears.

## 15. Roadmap

**UX + speed batch (latest):** faster defaults (Gemini 2.5 Flash, **parallel**
carousel render, cycling `ProgressSteps`, low Adversary effort) · redesigned
**model picker** (`MODEL_CATALOG` + `lib/provider-icons.tsx`, scrollable dialog,
tier cards) · **markdown** Adversary chat (`components/Markdown.tsx`) + **hints**
(`/api/hints`) · **carousel icons** (emoji + `lib/slide-icons.tsx` line icons),
source credit, plain-language prompts · **fixed Library save** (`lib/carousels.ts`
now surfaces errors). No new DB migrations.

**Usability batch (prior):** **plain-English** ELI5 lead card on every synthesis · **grounded reader-mode** retrieval (already shipped) · per-step **model clarity** line + mid-flow model switch + surfaced Adversary errors + model presets · **commit AI draft** (`/api/commit-suggest`, organizes *your* discussion) + collapsed optional fields · **bold multi-layout carousel** (statement / stat / quote / list / split) with a per-slide layout picker + regenerate-one in the Studio · **more sources** (arXiv + RSS outlets + lab blogs + more subreddits, deduped, recency-ranked, outlet-interleaved) · **grouped nav** (Today · Create▾ · Library▾ · Voice · ?) · in-app **user manual** (`/guide`) + first-run tip.

**Shipped since the original MVP:** the **daily ritual hub** (`/today`) — streak + track-record, one curated "form today's conviction" pick (dedup'd against your Ledger), and a "revisit your thinking" nudge — activating moat #3 (the habit loop) · Curator **Daily Brief** (`/brief`) · **automated daily radar** (Cron + `radar_snapshots`) with **server-side relevance** ranking in `/api/radar` · **pgvector** ledger re-surfacing + a **revise-thesis** flow (active → updated/abandoned, re-embedded) · a **deeper Ledger** — track-record stats ("keep score"), status filters + search, expandable evidence/steelman/source, and voice-tuned **Make carousel** (shared `lib/express-client.ts`) · **Expressor voice-tuning** (`/voice`) + **re-voice** existing slides · secure **per-user key** sync · **carousel image storage** · redesigned Satori carousel (5 themes) · **grounded synthesis** with **reader-mode** retrieval + verbatim citations on the news path (`lib/extract.ts` isolates the main article prose; "receipts" + a Grounded/⚠ badge) · **calibration scoring** — resolve a thesis (held/mixed/broke) and the Ledger scores how well your confidence matched reality (`lib/ledger-stats.calibration`, migration `0008`) · **durable resume** of an in-progress conviction (localStorage session; survives refresh/crash) · a ready-to-post **caption** + [`DEPLOY.md`](./DEPLOY.md) (Vercel-ready).

**Still deferred (by design):** a real **durable-workflow engine** (Inngest / Vercel Workflow) — the current resume is session-level, enough for an on-demand app · **opportunity detection** (needs usage data you won't have early) · a **global knowledge graph** (deliberately killed in favor of the personal Ledger — PLAN A6) · **auto-posting / scheduling** (the slop trap — PLAN A6/A8 keep the human in the loop; the Studio's **Copy caption** covers manual posting).
