# Test Cases — Conviction Engine

How to verify the app end-to-end. Two parts: an **automated smoke** (Playwright, no keys needed) and **manual cases** for the auth / AI / re-surfacing flows that need your keys + migrations.

> Note: a live Playwright **MCP** server isn't connected in this environment, so I shipped a runnable spec instead (`web/tests/e2e.spec.ts`). To have an agent click through live, add a Playwright MCP server to your client; otherwise run the spec yourself (below).

---

## 0. Prerequisites

```bash
cd web
npm install
npm run dev            # http://localhost:3000
```

- **Model key:** click **Model** (top-right) → paste a free Google AI Studio key (or set `GOOGLE_GENERATIVE_AI_API_KEY` in `web/.env.local`). For the Adversary on OpenAI, set **Adversary model → OpenAI**, model `gpt-5.5` (key blank → uses `OPENAI_API_KEY` from env).
- **Cloud (optional):** follow `web/SUPABASE.md` — run migrations `0001`, `0002`, **`0003`** (re-surfacing), and turn **off** "Confirm email" (Auth → Providers → Email) for instant test sign-ins.

## 1. Automated smoke (Playwright)

```bash
cd web
npm i -D @playwright/test
npx playwright install chromium
npx playwright test         # runs web/tests/e2e.spec.ts
```
**Expect:** all specs pass — landing + value chain, every nav route, Studio + the `/api/slide` PNG (image/png), login page, `/api/news` returns live items, and the synthesize guard.

---

## 2. Manual cases

| # | Goal | Steps | Expected |
|---|---|---|---|
| **TC1** | Free-forever fallback (no setup) | With no keys/Supabase, open `/`, click around | App works; **Model** dot is amber; no "Sign in" button (localStorage mode) |
| **TC2** | Model setup | Model menu → paste Google key → Save | Dot turns green |
| **TC3** | Thought → conviction → carousel (core loop) | `/think` → type *"AI agents will make most SaaS dashboards obsolete in 2 years"* → Synthesize → read synthesis → write a one-line take → Pressure-test → spar 2–3 turns → "I am ready to commit" → fill thesis → **Commit + make carousel** | Lands in **Studio** with slides generated from your thesis; preview renders |
| **TC4** | Anti-slop guarantee ⭐ | In the Adversary chat, type *"just tell me what to conclude"* | It **refuses** and asks you a question instead — never writes your opinion |
| **TC5** | News → conviction | `/news` → pick an item → it auto-synthesizes → continue as TC3 | Same pipeline, seeded from the news item |
| **TC6** | Curator brief | `/brief` → **Generate today's brief** | 3–5 ranked picks, each with *why it matters* (+ *for you* once you have theses); clicking one enters the flow |
| **TC7** | Per-step routing (Adversary on a reasoning model) | Model → **Adversary model → OpenAI**, `gpt-5.5` → run TC3's adversary step | Synthesis stays on the free model; the Adversary visibly reasons (brief pause) then steelmans — confirms routing |
| **TC8** | Cloud sync + accounts | Sign in (`/login`) → commit a thesis → check **Ledger** → sign out | Thesis appears under your account; gone after sign-out (cloud, per-user) |
| **TC9** | RLS isolation | Sign in as user A, commit a thesis; sign out; sign in as user B → Ledger | User B sees **none** of A's theses (row-level security) |
| **TC10** | Carousel save + gallery | In Studio, set a title → **Save** → open **Gallery** → **Open** it → edit → **Download all (.zip)** | Carousel persists; reopens with your edits; zip contains 1080×1350 PNGs |
| **TC11** | Semantic re-surfacing ⭐ (needs `0003` + signed in) | Commit 2–3 related theses (e.g. about AI agents / SaaS). Start a *new* related conviction (`/think`) and reach the synthesis step | A **"Related to your past thinking"** panel lists your prior theses — *"Does today change any of these?"* |
| **TC12** | Free path with no key | Clear the Model key → try `/think` Synthesize | A friendly "add a model key" message (no crash); 400 `no_model` under the hood |

⭐ = the two cases that prove the product's thesis (anti-slop + the compounding moat).

---

## 3. What's verified vs. needs you

Already verified by build + scripts: production build (18 routes), Satori PNG render, live news connectors, Supabase table + RLS, the **AI pipeline live** (synth + curator on Google, Adversary on OpenAI `gpt-5.5`), and OpenAI embeddings at 1536 dims. **TC8–TC11** need your Supabase migrations + a confirmed user, which is what these cases walk you through.
