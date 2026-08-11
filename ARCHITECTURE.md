# Architecture

How Crux is put together, and — more usefully — which designs were considered and rejected.

The app is one Next.js 16 project in [`web/`](web). There is no separate backend, no queue, no workflow engine.

---

## 1. The shape

```
                        ┌──────────────── the browser owns the pipeline ────────────────┐
paste a link ─┐         │                                                                │
pick a story ─┼─→ parseInput ─→ /api/synthesize ─→ [ you read it ] ─→ /api/adversary ──┐ │
raw thought ──┘   (URL or not)   fetchReadable       three exits        Coach | Spar   │ │
                                 + verify quotes                                        │ │
                                                                                        ▼ │
                    Supabase ←── addThesis (upsert) ←── [ you commit ] ←── /api/commit-suggest
                       │                                                                  │
                       └─→ /api/express ─→ normalizeSlide ─→ Studio ─→ client rasterizer ─┘
                                                                        PNG · ZIP · PDF
```

Every arrow is a human click.

**Why no orchestration framework.** The obvious "improvement" is to run this as a server-side graph — one call in, a carousel out. It was rejected because the pauses are the product: the whole premise is that *you* read the breakdown and *you* form the view. An engine that runs the steps back-to-back would produce the exact laundered slop Crux exists to avoid. State lives in React plus a localStorage session (`lib/flow-session.ts`) so a refresh resumes; that is the entire orchestration layer, and it is enough.

**Why no agents.** The one place an "agent" was tempting is fact-checking the synthesizer. That job turned out to be a substring match — see §3 — which is faster, free, and cannot itself hallucinate.

---

## 2. The trust boundary

Every `/api/*` route that spends the model key calls `guard()` (`lib/api-guard.ts`) first. The proxy matcher deliberately excludes `/api`, so this is where auth lives — per-route rather than regex-wide, which is what lets `/api/news` and `/api/radar` stay public (they read free sources and spend nothing) while everything else is gated.

Three things follow from that one function:

- **Rate limit.** 60 model calls per user per trailing hour, counted in `ai_calls`. The row is written *before* the work, so calls that never finish still count — a retry storm is exactly when you want the limit to bite.
- **Cost.** The same row is filled in afterwards with tokens, price, latency, attempts and an error code. Recording is fire-and-forget by contract: metering must never fail work the user is entitled to.
- **Request id.** Minted here, returned as `x-request-id`, and written to the `ai_calls` row — so a failed response, its log lines and its spend are one grep apart.

**The client never names a model.** It sends a *tier* — `speed` / `balanced` / `deep` — and `resolveServerSettings` picks a provider from those the server can actually reach. This makes "select a provider with no key configured" unrepresentable rather than merely discouraged; an earlier version let the client choose and every new user on a fresh deployment started broken.

---

## 3. Grounding, and why it's not a prompt

The synthesizer is told to quote the source. Models comply enthusiastically — including when there is no source, where they will invent quote-shaped text with plausible URLs. Prompting harder does not fix this.

So `/api/synthesize` keeps the fetched page text and, after generation, runs every quote through `verifyCitations` (`lib/citations.ts`): punctuation-tolerant normalization, then a substring check against that exact text. Quotes that fail ship to the UI marked **unverified** rather than being silently dropped — the user sees which claims trace back. With no source material at all, citations are dropped entirely.

`grounded` is computed from whether real source prose was retrieved, not guessed from the input shape. The badge appears on **every** path; gating it on "did the user pick a news item" is what once let a pasted link produce a confident summary of a page nobody had fetched.

Retrieval itself (`lib/extract.ts`) is reader-mode extraction with an 8s abort and a 7k cap, behind an SSRF guard that re-validates **every redirect hop** — a single up-front check is defeated by a redirect to `169.254.169.254`.

---

## 4. Generation

One choke point: `generateStructured` (`lib/ai/generate.ts`), wrapping the AI SDK's `generateText` + `Output.object`. Nothing calls a model without going through it (except the streaming sparring partner, which funnels through the same `getModel`).

It classifies failures rather than treating them alike. Everything used to be retried with a "your previous response failed validation, return valid JSON" nudge appended — so a bad API key spent three attempts pleading with the provider to fix its JSON. Now `APICallError.statusCode` decides: auth and 4xx fail immediately, 429/5xx/timeouts retry with jittered backoff that honours `retry-after`, and only a genuine schema failure earns the repair nudge. Every call carries a 45s timeout.

**Zod everywhere.** No route parses model output by hand; `JSON.parse` on a completion appears nowhere in the codebase.

**Anti-fabrication in code, not prose.** `normalizeSlide` / `normalizeModule` (`lib/carousel/llm.ts`) drop numeric visual modules whose data the model didn't actually supply — a bar chart with invented values is worse than no chart.

---

## 5. Rendering

The preview *is* the export. `SlideCanvas` is ordinary HTML/CSS; `lib/carousel/export.ts` rasterizes the live DOM with `modern-screenshot` at exactly 1080×1350. WYSIWYG holds by construction rather than by two implementations agreeing.

An earlier design rendered server-side through `next/og` (Satori), which meant writing every slide twice — once in Satori's flexbox-only subset for the server, once in real CSS for the preview — and they drifted. That path was deleted in full (~500 lines).

Two export details that were bugs first: PDF pages are built in **points**, because jsPDF treats `px` as 1/96in and silently emits a 1440×1800 page; and pages embed **JPEG**, because handing jsPDF a PNG makes it decode, split alpha per-pixel and re-deflate at level 9 — several synchronous seconds per slide.

---

## 6. Data

Supabase Postgres, RLS on every table, own-row policies only. `match_theses` is SECURITY INVOKER with an explicit `auth.uid()` filter.

| Table | Holds |
| --- | --- |
| `theses` | your takes: statement, confidence, evidence, outcome, **`synthesis` jsonb**, pgvector embedding |
| `carousels` | slides as jsonb + rendered PNG URLs |
| `user_voice` | writing samples, distilled style guide, followed topics |
| `radar_snapshots` | the daily feed scan (public read; its sources are public) |
| `ai_calls` | one row per model call — the cost ledger |

**Synthesis is stored on the thesis, as jsonb.** It was once request-scoped and thrown away at commit, which quietly broke three things at once: carousels made later from the track record were ungrounded with no warning, repurposing was too, and there was no way to save an understanding without also having an opinion. Normalized `claims` / `evidence` tables were rejected — there is still no query that joins across them.

Migrations are applied **by hand, in order** (`web/SUPABASE.md`). Several fix real exposure bugs; 0012 in particular scopes storage reads, because `select` on `storage.objects` grants LIST, not just read-by-URL.

Local storage mirrors all of this when Supabase is absent. Every key is `ce.*` and they are cleared on sign-out and on user change (`lib/local-state.ts`) — without that, the next account to sign in on the same machine inherited the previous one's draft, chat transcript and handle.

---

## 7. The feed

`lib/sources.ts` aggregates HN, Hugging Face papers, GitHub, Reddit, Lobsters, arXiv and ~17 RSS feeds — dependency-free, regex-parsed, every fetch inside `Promise.allSettled` so one dead source costs only its own results. A daily cron stores a 30-item snapshot; `/api/radar` re-ranks it per user.

Ranking (`lib/rank.ts`) blends per-source min-max popularity with personal relevance, and keeps **two separate signals**: topics you explicitly follow, and topics of takes you've written. They were once merged into one keyword bag, which is how the feed came to tell a user "Because you follow **data**" about a word they had never typed — it was sitting inside one of their own saved sentences.

A followed topic also *fetches*: HN search, Google News search and arXiv all accept a query, so an interest pulls in real articles instead of only re-sorting a fixed list. Before that, seven of twelve ordinary topics matched zero of the day's thirty items.

---

## 8. Testing

Two Playwright projects. **unit** specs import a function and assert on its return — no server, no browser, about a second. **browser** specs run against a server pinned to *no Supabase* and `MOCK_LLM=1`, which makes the whole suite deterministic, free and secret-free; the login gate gets its own spec that boots a configured server on purpose.

The mock seam is `getModel()` (`lib/ai/model.ts`) — the one point both `generateText` and `streamText` pass through — returning a `MockLanguageModelV3` whose fixtures are derived from each caller's Zod schema.

`npm run typecheck` includes the tests, so a spec importing a deleted function fails to compile rather than at runtime.

---

## 9. Evaluation

`POST /api/eval` (dev-only; it refuses when `NODE_ENV=production`, which is also why Vercel cron can't host it) runs ten golden items through the **real** pipeline. Seven are thought-path takes; three are adversarial sources chosen for specific failures — dense numbers, deliberate hedging, and pure marketing hype with no facts to summarize.

Each result gets LLM-judge scores *and* the deterministic `citationFaithfulness`. The judge wobbles ±0.3 run to run; the substring check does not. The GitHub **Eval** workflow is manual-dispatch (it spends real tokens) and appends to `web/eval-history.json`, so quality is a trend.

Failed items are counted and reported. They used to be dropped from the average, which meant a run where most items crashed looked identical to a clean one.

---

## 10. Deliberately not built

Multi-agent orchestration · a server workflow engine · LangChain/LangGraph · Langfuse/OTel (a 40-line owned table answers the cost questions at this scale) · Redis rate limiting · paid search APIs · normalized claims/evidence tables · provider fallback (the parameter existed unused across twelve call sites while the README advertised it — deleted) · encrypting `user_secrets` (deleting the table beat encrypting it) · platform OAuth auto-publishing (review-gated APIs and token infrastructure to save one upload; PDF export captures most of the value) · learned personalization (explicit topics suffice at this scale) · scheduled-post reminders.
