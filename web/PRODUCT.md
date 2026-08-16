# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Someone who reads a lot about AI and adjacent technology and wants to publish opinions worth reading — most often on LinkedIn, also X and Instagram. They are a practitioner, not a beginner: the product talks to a smart peer, not down to a novice.

Their situation: they see something worth having a view on, but forming a defensible one takes ten minutes of real thinking they never spend, so they either post a hot take or post nothing. The job is *"help me hold an opinion I can defend, then get it out the door in my own voice."*

Two audiences are served at once and both are primary in practice:

1. **Daily users** — the habit loop is the product. Second-week retention is the real test.
2. **Evaluators** — the creator's flagship portfolio artifact, judged by a recruiter or peer in roughly a minute. Proof of engineering and design judgement.

Where they conflict, users win. The evaluator case is served by the product being genuinely good and by making its own measurement visible, not by a separate demo path.

## Product Purpose

Turn a story or a raw thought into a defensible opinion the user owns, then render that opinion as a studio-grade social carousel in their voice.

The value chain the product is built around: Information → Understanding → Insight → **Opinion** → Content. Every other tool automates the first step and the last. Crux protects the middle.

Success is not posts generated. Success is: a user has a track record of opinions with recorded confidence, scored against what actually happened, that gets more valuable the longer they use it.

## Positioning

**The AI argues with you so you think harder — it never writes the opinion.** The user owns two of the five steps (forming the view, standing behind it); the AI does everything around them: reading the source, pushing back, designing the carousel.

Two mechanisms a neighbouring product could not truthfully copy:

- **Deterministic citation verification.** Every quote the synthesizer produces is checked by string match against the fetched source text. No judge, no model opinion. The current benchmark reads `citationFaithfulness 1.00` — nothing was invented.
- **The calibration ledger.** Saved opinions carry a stated confidence and are scored later against real outcomes, producing a Brier-style calibration score. It answers *"were you right when you were confident?"* — and it compounds. No competitor scores the user's own predictions.

## Operating Context

The loop: notice something (`/today`, `/explore`, or a pasted link) → break it down (grounded synthesis with verified quotes) → optionally argue with Coach or Spar → save a take with a confidence → render a carousel → export → score the take weeks later.

Exports land as 1080×1350 PNGs, a `.zip`, or a LinkedIn-ready PDF. Publishing is manual and deliberate: the user posts, the product does not.

Three ways out of the middle of the flow, all real product states: save understanding without an opinion (a parked draft), take the opinion without a carousel, or produce a neutral explainer deck with no opinion at all.

## Capabilities and Constraints

- Next.js 16 (App Router), React 19, Tailwind v4, AI SDK v6, Supabase (auth + storage), deployed on Vercel.
- Dark-only. `color-scheme: dark`; there is no light theme and none is planned.
- Signed out, everything except the landing page and auth is gated. Signed in without Supabase configured, the app runs single-user out of `localStorage`.
- Carousels render as real HTML/CSS and export client-side via `modern-screenshot` — the on-screen preview *is* the PNG. There is no server-side image pipeline.
- Twelve editorial carousel designs, ten narrative formats, ten visual module types.
- The user picks a *thinking depth* (Speed / Balanced / Deep), never a vendor or a model id. Provider selection is server-side because only the server knows which keys exist.
- No billing, no teams, no platform OAuth auto-publishing. Deliberate omissions, not backlog.
- Terminology, used consistently in UI and code: a **take** (a committed opinion) lives in the **track record**; a **breakdown** is the grounded synthesis; **receipts** are the verified quotes; a **deck** is the carousel; **Coach** helps you find a view, **Spar** attacks the one you have.

## Brand Commitments

- Name **Crux**. Logomark: an amber rounded-square tile carrying a dark crosshair — "get to the crux".
- The one promise: **"It doesn't write your posts. It makes you someone worth reading."**
- Voice: plain, concrete, a little dry. Short declarative sentences. Confident but earned — show the reasoning, name the trade-off. Banned words: revolutionary, delve, leverage, landscape, unlock.
- Anti-slop is the soul. The AI sharpens the user's opinion; it never authors it. Any copy or feature implying otherwise is off-brand.
- Icons are drawn SVGs from `lucide-react`. Never emoji.
- Full brand record: `../BRAND.md`. Visual system: `DESIGN.md`.

## Evidence on Hand

Real, and safe to cite:

- `web/eval-history.json` — a golden set of ten items including three adversarial sources, run through the real pipeline. `citationFaithfulness 1.00` (deterministic), synthesis grounding/clarity/neutrality 3.5 / 4.3 / 4.2, carousel faithful/sharp/no-fabrication/quality 4.5 / 4.2 / 4.7 / 4.1, 10/10 scored, 0 failures. Judge scores wobble ±0.3 between identical runs; treat small movements as noise.
- `docs/*.png` — current product screenshots, regenerated from the running app by `web/tests/capture.spec.ts` with a seeded account.

**Absent — must never be fabricated:** no users, no testimonials, no customer logos, no press, no revenue, no benchmarks other than the eval file above, no uptime or scale claims.

## Product Principles

1. **The opinion is the user's, always.** The AI reads, argues, and designs. It does not conclude. A feature that hands the user a conclusion is off-strategy no matter how well it performs.
2. **Measured, not asserted.** Any claim the product makes about itself must be backed by something checkable, and the check should be visible in the product, not just the README.
3. **Reading is free; thinking is the commitment.** Opening or expanding anything costs nothing and calls no model. The user chooses when work happens.
4. **The track record is the moat.** Prefer whatever makes saved takes accumulate, connect, and get scored over whatever produces more output.
5. **One decision per screen.** Every surface should make it obvious what the single next thing is.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Already load-bearing in the codebase and not to be regressed: a visible `:focus-visible` ring on every interactive element, a real focus trap and focus restoration in `Dialog`, a skip link, `prefers-reduced-motion` honoured globally, and 44px touch targets on primary controls. Body text ≥4.5:1, large text ≥3:1. Colour is never the only carrier of state.
