# Agentic AI Content Pipeline → **Conviction Engine**

A thinking-augmentation system for technologists. **Not** a content factory — content is the exhaust. The product helps you move through the chain that actually matters:

> **Information → Understanding → Insight → Opinion → Content**

The defensible territory is the **middle** (Understanding → Insight → Opinion) — the part neither the free news tools (TLDR, Feedly, Perplexity) nor the crowded posting tools (Taplio, Hypefury) touch.

## One-line thesis
> It doesn't write your posts. It makes you someone worth reading.

## Status: **MVP built** — a free-forever app in [`web/`](./web)

Pick trending AI news **or** type your own thought → grounded synthesis → an **Adversary** that makes you defend a take (it refuses to conclude for you) → commit a calibrated thesis → export a **carousel** (free PNGs via Satori). Free models by default (Gemini free tier / Ollama), optional BYOK.

- **[PLAN.md](./PLAN.md)** — full research, competitor landscape, architecture, MVP, monetization, risks.
- **[web/](./web)** — the application (Next.js 16 + AI SDK v6 + Tailwind v4).
- **[pilot/](./pilot/)** — the original no-code pilot kit (now an optional parallel sanity-check).

### Run it
```bash
cd web
npm install
npm run dev        # http://localhost:3000
```
Then click **Model** (top-right) and paste a **free** Google AI Studio key
(aistudio.google.com/app/apikey — 1,500 req/day, no card). Or choose **Ollama**
for fully-local, or bring your own Claude/OpenAI key. Keys are stored only in your
browser. (Alternatively, set `GOOGLE_GENERATIVE_AI_API_KEY` in `web/.env.local`.)

## Start today
1. Open **[pilot/README.md](./pilot/README.md)**.
2. Do the ~15–20 min daily ritual: pick one item → synthesize → interrogate yourself → commit a thesis → (optionally) make a carousel.
3. Log it in **[pilot/daily-log.md](./pilot/daily-log.md)**; record opinions in **[pilot/thesis-ledger.md](./pilot/thesis-ledger.md)**.
4. After ~2 weeks, apply the **Go/Kill gate** in the pilot README.

Phase 1 (a thin Next.js + AI SDK app) begins **only if** the pilot clears its gate.

## Niche (for now)
AI / GenAI. Output format being prototyped: IG/LinkedIn carousels.
