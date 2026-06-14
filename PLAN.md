# Conviction Engine — Research, Strategy & MVP Plan

> Working name: **Conviction Engine** (a thinking-augmentation system for technologists).
> Earlier framing was "AI Content Pipeline." That framing is the trap; see Context.

---

## Context

**What prompted this:** A research brief proposing an "AI-Powered Tech Intelligence & Content Creation Operating System" — an agentic platform that monitors the tech landscape, extracts insights, and turns them into social content. The brief contained 6 product ideas, 7 proposed agents, a knowledge graph, auto-design, and 12+ sources, and explicitly asked me to **challenge every assumption**.

**The decisive reframe (from you):** The goal is **not** content creation. The goal is helping a technologist **develop deep understanding and informed opinions** about fast-moving domains. Content is merely one output. The real value chain is:

> **Information → Understanding → Insight → Opinion → Content**

**Why this changes everything:** The original framing ("monitor → summarize → post") walks straight into two *saturated* markets — free news aggregation and crowded content tooling — and competes on neither's strength. The reframe points at the **one layer nobody owns: the middle (Understanding → Insight → Opinion).** That is the intended outcome of this plan: define and build the smallest system that reliably moves *you* through that middle, with a carousel as the proof-of-value output.

**Your five decisions (locked):**
- **Audience:** Build for *yourself* first (audience-of-one), productize later. → de-risks everything; your accumulated theses + voice become the moat.
- **Scope of this doc:** Deep research + challenged assumptions + alternative architecture + the *smallest* product.
- **Niche:** AI / GenAI.
- **Output format:** Carousels (IG / LinkedIn) — treated as the *demo surface*, not the core.
- **First step:** **Assemble-first pilot** — validate the loop with off-the-shelf tools (no code) before building anything. See Part C, Phase 0.

---

## TL;DR

1. **Kill the "content pipeline" framing.** Both ends (news, posting) are commoditized. Build the **missing middle**: a system that helps you *form and defend your own opinions*, not one that generates opinions for you.
2. **The anti-slop principle is the whole product.** A tool that *hands you a finished take* produces laundered AI slop and destroys the brand you're trying to build. A tool that *makes you think* — synthesizes inputs, surfaces the real debate, then **adversarially interrogates you** until you commit to a calibrated view — builds genuine conviction. Friction is the feature ("desirable difficulty").
3. **The compounding asset is a personal Thesis Ledger,** not a knowledge graph of all of tech. Your evolving, evidence-linked, battle-tested opinions are data no competitor has and that gets more valuable every day you use it.
4. **Architecture: one durable pipeline + one human-in-the-loop adversarial step.** ~4 lightweight agents (Curator, Synthesizer, Adversary, Expressor) + the Ledger. Not 7 agents, not a knowledge graph, not a design engine, not multi-agent crews. Boring, observable, cheap.
5. **First move = a no-code "assemble-first" pilot, not a build.** Run the loop (NotebookLM/Perplexity → a Steelman-style Claude prompt → Canva) on real AI news for ~2 weeks. A Go/Kill gate decides whether you build — and the pilot itself writes the build spec. Everything else in the brief is the roadmap, not the MVP.

---

# Part A — Research & Strategy

## A1. The reframe, stated precisely

The brief's six ideas are not a product; they are points on one value chain. Mapping them:

| Brief idea | Value-chain stage it really serves |
|---|---|
| Idea 4: Trend Radar | Information (what happened) |
| Idea 1: Trend→Content | Information → Content (skips the middle ← the flaw) |
| Idea 6: Knowledge Graph | Understanding (connect to prior knowledge) |
| Idea 2: Thought→Content | **Insight → Opinion** (the real differentiator) |
| Idea 3: Brand Intelligence | Opinion memory + voice (the moat) |
| Idea 5: Opportunity Detection | A monetization/SEO feature, not core |

The brief over-invests in the two ends (Information and Content) and under-specifies the middle. The reframe inverts the priority.

## A2. How experts, analysts & investors *actually* build conviction (research → a reusable model)

Synthesizing how equity/industry analysts, thesis-driven VCs (ARK's top-down+bottom-up; "variant perception"), and superforecasters (Tetlock) work, the repeatable process is **8 steps** — and it is the spine of the architecture:

1. **Curate a narrow, high-trust input diet.** Experts do *not* drink the firehose. They follow a small set of **primary** sources (the paper, the changelog, the actual model) + a few trusted humans, and treat commentary as secondary.
2. **Synthesize *across* sources, not within one.** Triangulate. What do independent sources agree/disagree on? What is genuinely *new* vs. repackaged? How does it connect to what I already believe?
3. **Find the variant view / the key debate.** Insight lives in the disagreement. "Where does my read differ from consensus, and why?"
4. **Form a thesis with explicit assumptions.** Narrative + "why now" + "what has to be true." Crucially, **writing is the thinking**, not a record of it.
5. **Stress-test it.** Steelman the opposite, build the bear case, run a pre-mortem, check base rates, ask "what would change my mind?"
6. **Commit with calibrated confidence.** Take a position; assign confidence; note the triggers that would flip you. "Strong opinions, loosely held."
7. **Update over time.** New evidence → revise. Keep score (calibration).
8. **Communicate.** Publishing forces clarity and exposes the view to feedback ("learn/build in public").

**The irreducibly human steps are #4 and #6 (forming and committing).** This is the design fulcrum: the AI augments steps 1–3, 5, 7–8; the *human* owns 4 and 6. A product that automates 4 and 6 is a slop machine; a product that scaffolds them is a conviction engine. This directly answers your research questions 1–4.

## A3. Market validation — is the *middle* a real, unmet need?

- **The pain is real and worsening.** The volume/velocity of AI news is up; the *cost of a wrong or shallow take* (to a personal brand or an investment decision) is up; and AI has made shallow content *infinitely cheap*, which paradoxically makes **genuine, defensible opinion scarcer and more valuable**. The scarce good is no longer information — it's a *point of view you can defend*.
- **Validation signal:** People already pay for the *ends* (Taplio/Hypefury for posting; ChatGPT/Perplexity Pro for research) and for *passive* second brains (Tana, Mem). Nobody is paid for the *active middle*. Generic adversarial-reasoning tools (Steelman, "The Philosopher") have emerged in 2026 — proof the reasoning-partner pattern resonates — but none are wired to a live domain or a persistent body of work.
- **Honest caveat:** This middle is a *behavior-change* product (it asks the user to think harder), which is harder to sell than a time-saver. That is precisely why **dogfooding it yourself first** is the correct path — you validate the behavior on the one user you control before betting on strangers adopting a "think more" tool.

## A4. Competitor landscape — the five layers and the missing middle

| Layer | Job-to-be-done | Representative tools (2026) | Why it doesn't cover the middle |
|---|---|---|---|
| **1. Information** | "What happened?" | TLDR AI (~1.25M), The Rundown (~2M), Feedly Leo, Perplexity briefing, Particle | Summarizes; no opinion, no memory, no *you* |
| **2. Research / synthesis** | "Summarize this corpus" | NotebookLM, Elicit, Consensus, ChatGPT/Gemini/Perplexity Deep Research, Storm, scite | Built for *static academic literature reviews*, not continuous domain tracking or personal thesis formation |
| **3. Adversarial reasoning** | "Stress-test my argument" | Steelman, "The Philosopher", devil's-advocate prompts | Generic; not connected to live tech inputs or your prior views |
| **4. Content** | "Make me a post" | Taplio, Hypefury, Typefully, PostNitro, Contentdrips, Mirra, Buffer AI | Starts *after* the opinion exists; encourages slop |
| **5. Memory** | "Store my notes" | Tana, Mem, Reflect, Notion AI | Passive repositories; tag/retrieve, don't build or update conviction |

**The gap:** No tool runs **1→2→3→(human forms view)→5(updates)→4** as a *continuous, personal, compounding loop* for one fast-moving domain. That connective tissue, plus the Thesis Ledger, is the defensible product.

## A5. Differentiation & positioning

- **Positioning (one line):** *"It doesn't write your posts. It makes you someone worth reading."* A conviction engine for AI/tech that turns the firehose into **your** defensible opinions — and, only then, into content.
- **Three moats, in order of durability:**
  1. **The Thesis Ledger** — your accumulated, evidence-linked, time-stamped, stress-tested opinions. Compounds daily; impossible to copy; improves personalization and re-surfacing over time. *This is the real "knowledge graph" from the brief — personal, small, and high-ROI rather than global and unmaintainable.*
  2. **Voice + taste data** — how *you* phrase a take, which debates *you* care about. Competitors don't have your corpus.
  3. **The workflow itself** — owning the habit loop (a daily 10-minute "form one conviction" ritual) is stickier than any single feature.
- **Why "me-first" is strategically correct:** it converts the weakest startup position (no users, no data, crowded field) into the strongest (one committed power user generating a proprietary dataset and a public track record that *is* the marketing).

## A6. Assumption challenges — what to kill, defer, or keep

| Brief assumption | Verdict | Reasoning |
|---|---|---|
| 7 specialized agents | **Kill** | Ranking/Fact-check are single LLM calls, not agents. Collapse to ~4. Multi-agent adds latency, cost, failure modes, debugging hell for no MVP benefit. |
| Knowledge graph of all tech | **Defer/Reframe** | A global tech KG is a maintenance sink with low early ROI. Replace with a *personal Thesis Ledger*. Revisit a graph only if "compare X vs Y over time" becomes a core, repeated use case. |
| Auto-generated design/carousels | **Buy, don't build** | Canva's programmatic Autofill is Enterprise-gated and not built for multi-slide rendering. Integrate a templating service (Contentdrips/Templated) or Canva brand templates via the available Canva MCP. AI-generic carousels also lose reach in 2026 — keep a human in the loop. |
| 12+ ingestion sources | **Cut to ~6–8** | 80% of AI signal = a few company blogs/changelogs + arXiv (cs.AI/CL/LG) + HN front page + GitHub trending + 1–2 curated X lists. Breadth is a v2 treadmill (scraping/ToS/transcription cost). |
| 6 customer segments | **Cut to 1 (you)** | Creators/PMs/investors want different things. Serve one user (yourself) perfectly first. |
| "Automate posting" | **Kill for now** | Full automation is the slop trap and brand risk. Human-in-the-loop is non-negotiable while building authority. |
| Multi-agent framework (CrewAI etc.) | **Not needed for MVP** | A single durable pipeline + one HITL loop is simpler and sufficient. |

## A7. Monetization (later — you chose me-first)

- **Where value accrues:** on the **creation/conviction** side, never on the (free, commoditized) information side. The willingness-to-pay precedent is Taplio (~$40–65/mo) and research Pro tiers, *not* news.
- **Sequenced model when you productize:**
  - *Free / acquisition:* a public daily "one conviction" artifact (your own brand does this).
  - *Pro (prosumer creators/analysts):* voice-trained drafting + the Thesis Ledger + adversarial mode + scheduling.
  - *Later:* teams (VC/research desks running shared theses), API/MCP access.
- **Honest take:** for the first 6–12 months the "monetization" that matters is **distribution** — your own AI/tech audience and public track record are worth more than early MRR and teach you the market. Productize only after the audience-of-one loop demonstrably works.

## A8. Risks, limitations & the central paradox

1. **THE PARADOX (biggest risk):** *Does an AI that helps you form opinions defeat the purpose of having your own?* If the system vends finished takes, yes — you've laundered AI's opinion as yours, and the audience can smell it. **Mitigation = the core design stance:** the AI is an *adversary and Socratic partner*, not an author. It must refuse to write your conclusion; it surfaces tensions, steelmans the other side, and forces *you* to commit. Measure success by *"would I have reached this view without it?"* — the answer should be "I reached a *better-defended* version of *my* view."
2. **AI-slop backlash / brand risk** — generic auto-content is penalized in 2026. → human-in-the-loop, opinion-first, voice-trained.
3. **Over-scope** — 6 ideas × 7 agents = never ships. → ruthless MVP; the rest is roadmap.
4. **Ingestion fragility & cost** — scraping X/Reddit/YouTube, ToS, transcription. → start with stable APIs/RSS only.
5. **Authenticity / uncanny voice** — a draft that's "almost you" erodes trust. → output *structured arguments + slide copy in your voice*, you do final wording.
6. **Hallucinated synthesis** — wrong "facts" destroy conviction. → grounding + citations (NotebookLM-style: answer only from retrieved sources), show receipts.
7. **Solo bandwidth vs. a crowded field** — → me-first sidesteps the race; you compete on *your* taste, not on out-engineering funded incumbents.
8. **Legal** — summarizing/republishing sources. → transformative commentary + attribution; never wholesale reproduction.

---

# Part B — Architecture & Agent Design

## B1. The Conviction Pipeline (replaces the 7-agent / KG design)

A mostly-linear **durable pipeline** with exactly one human-in-the-loop adversarial loop. Four lightweight agents + one memory store. Each maps to the 8-step conviction model (A2):

```
        ┌─────────── Thesis Ledger (memory; pgvector + Postgres) ───────────┐
        │   your evolving, evidence-linked, calibrated opinions over time    │
        └───────▲───────────────────────────────────────────────▲───────────┘
                │ (re-surfaces challenged/confirmed theses)       │ (commit)
   ┌─────────┐  │   ┌──────────────┐   ┌───────────────────────┐  │  ┌────────────┐
   │ CURATOR │──┴──▶│ SYNTHESIZER  │──▶│  ADVERSARY (HITL loop)│──┴─▶│  EXPRESSOR │
   └─────────┘      └──────────────┘   └───────────────────────┘     └────────────┘
   steps 1          steps 2–3          steps 4–6 (human owns 4&6)     step 8
   narrow ingest    cross-source       Socratic + steelman:          committed thesis
   + relevance      grounded synthesis  "here's the real debate,      → carousel copy
   filter to your   + "what's actually  defend your view" — refuses    → render via
   tracked theses   new" + key debate   to write your conclusion       template/Canva MCP
```

- **Curator** (step 1): pulls ~6–8 AI sources, dedupes, filters to relevance against your tracked theses/interests. Replaces brief's *Trend Discovery + Ranking*.
- **Synthesizer** (steps 2–3): grounded, cited cross-source synthesis — *what happened, what's genuinely new, how it connects to what you already believe, and what the key debate is.* NotebookLM-style discipline (answer only from retrieved text). Replaces *Research + Fact-check*.
- **Adversary** (steps 4–6, **the core**): a Socratic/steelman dialogue. Surfaces the strongest opposing case; breaks claims into empirical-vs-value (à la Steelman); asks *you* the hard questions; **never writes your conclusion.** You type your take; it pressure-tests it; you commit a calibrated view to the Ledger.
- **Thesis Ledger** (step 7, **the moat**): stores each committed thesis with evidence, confidence, "what would change my mind," and timestamps. Later evidence re-surfaces theses for updating. This is the reframed, *personal* knowledge graph.
- **Expressor** (step 8): only *after* you commit, turns *your* thesis + reasoning into carousel slide copy in your voice. Replaces *Content Strategy + Design + Publishing*. Rendering is integrated, not built.

## B2. Why this shape (single pipeline + 1 HITL loop, not multi-agent crews)

- **Determinism where you want it, agency where you need it.** Only the Adversary step is genuinely agentic (a bounded dialogue loop). Everything else is a deterministic step → far easier to debug, eval, and trust.
- **Durability matters because of cadence + HITL.** A daily run that pauses for your dialogue and resumes needs durable execution (retries, resume-after-human). This is the legitimate reason to use a workflow engine — *not* multi-agent orchestration.

## B3. Recommended tech stack (boring on purpose; grounded in the loaded Vercel env)

| Concern | Choice | Why |
|---|---|---|
| App / UI | **Next.js (App Router) on Vercel** | You're already in this ecosystem; fastest path; carousel preview UI is trivial. |
| Model access | **Vercel AI SDK + AI Gateway**, default to **latest Claude (Opus 4.8 / Sonnet 4.6)** | Provider routing/fallback, observability, cost tracking. Claude's long-context reasoning suits synthesis + adversarial dialogue. |
| Orchestration | **One durable workflow** — Vercel Workflow (WDK) **or** Inngest; Vercel **Cron** triggers the daily run | Pause/resume for the HITL step, retries, crash-safety — without multi-agent complexity. (Python? LangGraph is the equivalent — only if you prefer Python.) |
| Memory / Ledger | **Neon Postgres (Marketplace) + pgvector** | Relational thesis ledger + semantic recall of prior theses/evidence in one store. |
| Ingestion | RSS / arXiv API / HN (Algolia) API / GitHub API first | Stable, ToS-clean, free. No scraping in MVP. |
| Carousel render | Canva **brand template via the available Canva MCP**, or Contentdrips/Templated API | Buy, don't build. Validate the Canva MCP path during MVP (note Autofill's Enterprise gate). |

**Explicitly not in the stack (and why):** CrewAI / heavy multi-agent (unneeded complexity); a global knowledge-graph DB (low ROI vs. the personal Ledger); a built-from-scratch design renderer (commodity); 12-source scrapers (fragile treadmill).

---

# Part C — MVP scope (your research question #5: the smallest product)

**Decided sequence:** validate the loop with **no code first** (you chose Assemble-First). Build only what the pilot proves. The smallest thing that moves you Information → Understanding → Insight → Opinion → Content is therefore a *ritual*, not an app — yet.

### Phase 0 — Assemble-first Conviction Pilot ✅ (DECIDED first step; no code, ~2 weeks)
Run the full middle with off-the-shelf tools to test the core bet before investing in a build. Daily, ~15–20 min:
1. **Pick ONE item** (not a feed) from a narrow set: an arXiv cs.AI/CL/LG abstract · an AI-lab blog/changelog · the top AI item on HN · a GitHub-trending AI repo.
2. **Synthesize** in **NotebookLM** (source-grounded, no hallucinated citations) or Perplexity/Claude Deep Research, fixed prompt: *"What actually happened? What's genuinely new vs. repackaged? What's the single biggest debate/uncertainty? What would an informed skeptic say?"*
3. **Interrogate yourself** with **Claude**, fixed adversarial system prompt: *"You are my adversarial thinking partner. Do NOT tell me what to conclude. Steelman the view opposite to mine. Split my claim into empirical claims vs. value judgments. Ask the 3 hardest questions that would change my mind. Refuse to write my opinion for me."* Run 2–3 rounds.
4. **Commit a thesis** to a manual ledger (Notion/Obsidian/plain doc): 1–2 sentences = calibrated view + confidence (low/med/high) + "what would change my mind" + date.
5. **Express** in **Canva** (brand template → 5–7 slides); review; post manually (posting optional during the pilot).
6. **Weekly:** re-read the week's theses; mark any challenged/confirmed by new events (hand-simulates the Ledger re-surfacing).

**Instrument it (one-line log/day):** did I publish? · "would I have reached this without it?" → *none / same view / **better-defended version of my own view*** (target = last) · did the Adversary try to hand me a conclusion? (design red flag) · time spent · conviction 1–5 · carousel post-worthiness 1–5.

**Go / Kill gate (decide after ~2 weeks, before any code):**
- **BUILD** if: ≥1 publish/week you stand behind **and** the dominant answer is "better-defended version of *my* view" **and** you'd miss the ritual if it stopped.
- **PIVOT/KILL** if: it mostly yields takes you wouldn't publish, or it feels like laundering AI's opinions, or only the carousel step adds value (then skip the middle — just use content tools).
- **The pilot writes the build spec:** the most painful/manual step → automate first; whether weekly re-surfacing mattered → governs building the Ledger early; the adversarial prompt that worked → becomes the Adversary agent's spec.

**What I can hand you immediately (no code):** a *pilot kit* — the exact synthesis + adversarial prompts, a daily-log template, an AI source shortlist (~6–8), and a Canva carousel-template checklist. → see [`pilot/`](./pilot/).

### Phase 1 — Walking skeleton (ONLY if Phase 0 clears the gate; ~days)
Codify the pilot as a thin app — the vertical slice, no ingest treadmill yet:
1. **Input:** paste a URL / arXiv abstract (manual — no Curator yet).
2. **Synthesize:** grounded, cited "what happened / what's new / the key debate."
3. **Adversary:** chat loop using the prompt the pilot validated; refuses to conclude for you.
4. **Commit:** calibrated thesis + confidence + "what would change my mind" → Ledger (Postgres).
5. **Express:** one click → carousel slide copy in your voice → render via Canva MCP / template → review & post manually.

### Phase 2 — Automate (MVP → v1), in order
1. **Curator** automation (the ~6–8 AI sources + relevance filter) + **Vercel Cron** daily run.
2. **Ledger re-surfacing** (step 7): new evidence pings a challenged prior thesis — *this is when the moat starts compounding.*
3. Voice tuning of the Expressor from your committed corpus.

### Deferred (the rest of the brief = roadmap, not MVP)
Multi-format output · scheduling/auto-publish · Idea 5 opportunity detection (needs data you won't have early) · Idea 6 global knowledge graph · multi-source breadth (Reddit/YouTube/podcasts) · multi-user/productization.

### Greenfield structure to create (Phase 1+, representative paths)
```
/app                      # Next.js UI: input, synthesis view, adversary chat, ledger, carousel preview
/lib/agents/curator.ts        # ingest + relevance filter (phase 2)
/lib/agents/synthesizer.ts    # grounded, cited cross-source synthesis
/lib/agents/adversary.ts      # Socratic + steelman dialogue; MUST NOT write the user's conclusion
/lib/agents/expressor.ts      # committed thesis -> carousel slide copy (user voice)
/lib/ledger/                  # Thesis Ledger: schema, write, semantic recall, re-surface
/lib/workflow/daily.ts        # durable workflow (Cron-triggered) orchestrating the pipeline
/lib/sources/                 # rss.ts, arxiv.ts, hn.ts, github.ts connectors
/lib/ai/gateway.ts            # AI SDK + Gateway config (default latest Claude)
```

---

# Part D — Verification

**Product (dogfood) verification — the real test:**
- **Primary gate = the Phase 0 pilot (no code):** run the assemble-first ritual daily for ~2 weeks; this *is* the validation, and its Go/Kill gate decides whether Phase 1 (build) happens.
- Pass criteria: ≥1 thesis/week you actually publish; the **"would I have reached this alone?"** answer is "a *better-defended version of my own* view" (not "the AI's view"); the carousel is post-worthy with light edits.
- Anti-slop check: deliberately try to get the Adversary to hand you a conclusion — it must refuse and redirect to questions. If it writes your opinion for you, the design has failed.

**Technical verification:**
- **Grounding:** Synthesizer claims must cite retrieved sources; spot-check for hallucinated facts (NotebookLM-style "sources only" discipline).
- **Pipeline durability:** kill the process mid-run during the HITL pause; confirm it resumes (workflow checkpointing).
- **Ledger:** commit a thesis; feed a contradicting item later; confirm the prior thesis re-surfaces for update.
- **Render:** confirm the Canva MCP / templating path produces an exportable carousel from Expressor output (validate the Enterprise/Autofill gate early — fall back to Contentdrips/Templated if blocked).
- **Cost:** a daily run over ~6–8 sources with the chosen models should be cents/day; confirm via AI Gateway observability before adding breadth.

---

## Sources

Competitive & technical research (mid-2026):
- Content tooling: [Taplio vs Hypefury (Writio)](https://writio.ai/blog/taplio-vs-hypefury) · [Taplio alternatives (OnlySocial)](https://onlysocial.io/taplio-alternatives)
- News aggregators: [Best AI digest tools 2026 (Brevio)](https://brevio.news/blog/best-ai-digest-tools-2026) · [Best AI news aggregators (Readless)](https://www.readless.app/blog/best-ai-news-aggregators-2026)
- AI newsletters: [Best AI newsletters 2026 (Dupple)](https://dupple.com/learn/best-ai-newsletters-2026) · [Is The Rundown free 2026 (Readless)](https://www.readless.app/blog/is-the-rundown-ai-newsletter-free-2026)
- Carousel automation: [Instagram carousel makers 2026 (PostNitro)](https://postnitro.ai/blog/post/instagram-carousel-maker) · [AI carousel automation guide (Mirra)](https://www.mirra.my/en/blog/ai-carousel-automation-complete-guide-2026)
- Canva API: [Canva Connect APIs docs](https://www.canva.dev/docs/connect/) · [Canva API alternatives (Layerre)](https://layerre.com/alternatives/canva-api-alternatives/) · [Developer-focused review (WaveSpeed)](https://wavespeed.ai/blog/posts/canva-ai-review-2026/)
- Agent frameworks: [Framework showdown 2026 (QubitTool)](https://qubittool.com/blog/ai-agent-framework-comparison-2026) · [OpenAI SDK vs LangGraph vs CrewAI (DigitalApplied)](https://www.digitalapplied.com/blog/openai-agents-sdk-vs-langgraph-vs-crewai-matrix-2026)
- Research/synthesis tools: [Best AI research assistants — NotebookLM vs Perplexity vs Consensus (Medium)](https://medium.com/activated-thinker/the-10-best-ai-research-assistants-notebooklm-vs-perplexity-vs-consensus-6e7a27ff5afc) · [AI tools for researchers 2026 (SaaSnik)](https://saasnik.com/ai-tools-for-researchers-in-2026/)
- Adversarial reasoning: [Steelman — adversarial reasoning tool](https://dylanamartin.com/2026/03/11/announcing-steelman.html) · [Best AI for philosophy / Socratic (Jenova)](https://www.jenova.ai/en/resources/best-ai-for-philosophy)
- Conviction / thesis frameworks: [Thesis-driven scouting (Qubit Capital)](https://qubit.capital/blog/thesis-driven-startup-scouting) · [Investment thesis frameworks (Investogy)](https://blog.investogy.com/investment-thesis-example/)
- Second brain / memory: [Best second brain AI apps 2026 (Saner)](https://www.saner.ai/blogs/10-best-second-brain-ai-apps) · [Notion vs Obsidian vs Roam 2026](https://dataresearchanalysiscollection.com/best-second-brain-apps/)

---

## Open questions (optional — refine later, not blockers)
- **Resolved ✅:** start with the assemble-first pilot (Phase 0) before any code.
- **Ledger depth (Phase 1 detail):** minimal (text + confidence) vs. structured (claims, evidence links, change-triggers) from day one — let the Phase 0 pilot inform this.
