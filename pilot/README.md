# Phase 0 — Assemble-First Conviction Pilot

**Goal:** prove that running the *middle* of the value chain (synthesis → adversarial interrogation → committed thesis) on real AI news measurably improves the quality and defensibility of your opinions — and produces carousels you'd actually post — **before writing any code.**

**Time:** ~15–20 min/day · **Duration:** ~2 weeks · **Cost:** $0 (free tiers).

**The bet being tested:** the scarce, defensible thing is not information (free) or posts (commoditized) — it's *a point of view you can defend*. This pilot tests whether a tool-assisted ritual reliably gets you there.

> **Rule #1 — the AI is your adversary and synthesist, NEVER your author.** If you ever copy an opinion the AI wrote, you've failed the pilot. *You* write the thesis. The tools sharpen it.

---

## The daily ritual (≈15–20 min)

1. **Pick ONE item** (not a feed) from [`sources.md`](./sources.md). One arXiv abstract, one lab blog post, the top AI item on HN, or one trending repo. Depth of attention beats breadth.
2. **Synthesize** — paste the source into **NotebookLM** (preferred; it grounds strictly to the source) or Perplexity/Claude, using [`prompts/01-synthesis.md`](./prompts/01-synthesis.md). Then **spot-check 2–3 claims against the original** — synthesis you didn't verify is confident hearsay.
3. **Form a gut take** — one sentence: what do *you* think this means? (Write it before the AI can anchor you.)
4. **Interrogate yourself** — open Claude with [`prompts/02-adversary.md`](./prompts/02-adversary.md) as the system prompt. Paste the synthesis + your gut take. Run **2–3 rounds**. Let it steelman the other side and ask the hard questions. **Don't let it conclude for you.**
5. **Commit a thesis** — write your final, calibrated view into [`thesis-ledger.md`](./thesis-ledger.md): 1–2 sentences + confidence + "what would change my mind" + date.
6. **Express** (optional daily; aim for ~3 carousels across the 2 weeks) — turn a committed thesis into a 5–7 slide carousel via [`canva-checklist.md`](./canva-checklist.md). Post it manually if you're proud of it.

Then add one row to [`daily-log.md`](./daily-log.md).

---

## Weekly review (~15 min, once a week)
Re-read the week's ledger entries. For each, did new events **confirm**, **challenge**, or not touch it? Note updates inline (dated). This hand-simulates the automated "Thesis Ledger re-surfacing" from the plan — notice whether it feels valuable, because that decides if we build it early.

---

## The Go / Kill gate — decide at ~2 weeks (before any code)

**BUILD (proceed to Phase 1)** if **all three** hold:
- ≥1 thesis/week you actually **published** and stand behind.
- Your most common answer to *"would I have reached this view without the tool?"* is **"a better-defended version of my own view"** (not "the AI's view," not "the same anyway").
- You'd genuinely **miss the ritual** if it stopped.

**PIVOT / KILL** if **any** hold:
- It mostly produces takes you **wouldn't publish**.
- It feels like **laundering AI's opinions** as yours.
- The **only** value is the carousel step → you don't need the middle; just use a content tool.

**Either way, the pilot writes the build spec.** Note as you go:
- Which step was most painful/manual → Phase 1 automates that first.
- Did weekly re-surfacing matter? → governs whether the Ledger is built early.
- Which exact adversary phrasing produced the best thinking → becomes the `adversary.ts` spec.

---

## Files in this kit
| File | Purpose |
|---|---|
| [`sources.md`](./sources.md) | Narrow, high-trust AI source shortlist (primary-first) |
| [`prompts/01-synthesis.md`](./prompts/01-synthesis.md) | The grounded synthesis prompt |
| [`prompts/02-adversary.md`](./prompts/02-adversary.md) | The adversarial / Socratic system prompt |
| [`thesis-ledger.md`](./thesis-ledger.md) | Your manual conviction ledger (the future moat) |
| [`daily-log.md`](./daily-log.md) | Daily instrumentation (drives the Go/Kill decision) |
| [`canva-checklist.md`](./canva-checklist.md) | POV-carousel structure + Canva setup |
