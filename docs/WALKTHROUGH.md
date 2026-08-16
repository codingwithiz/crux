# Walkthrough

A real session, start to finish — captured with Playwright driving a live, single-user instance of Crux with real model calls (no mocking). The take, the Coach/Spar argument, the carousel and the receipts below are exactly what the product produced, not staged copy.

Regenerate this set with `WALKTHROUGH=1 npx playwright test --config=web/playwright.walkthrough.config.ts` from `web/`. See `web/tests/walkthrough.spec.ts` for the script.

## The story: does RAG still make sense?

I pasted a link to the [Wikipedia article on retrieval-augmented generation](https://en.wikipedia.org/wiki/Retrieval-augmented_generation) with my own framing — that most teams reach for RAG out of habit rather than need. Crux fetched the real page, broke it down, and I argued the take with both Coach and Spar before saving it, turning it into a carousel, and scoring it.

---

### Landing

|  |  |
|---|---|
| ![Landing hero](walkthrough/01-landing-hero.png) | ![Landing full](walkthrough/02-landing-full.png) |

The hero states the mechanism, not the category — a live carousel cycling the real catalogue, not a recording. Scrolling down: the five-step chain, "How it works" as a numbered sequence, "Why it's different" led by the calibration claim, then the eval-harness numbers themselves (`1.00` citation faithfulness, measured, not asserted).

### Today, Explore, Guide, You — before anything is saved

| Today (empty) | Explore (loading → loaded) | Guide | You (default) |
|---|---|---|---|
| ![Today empty](walkthrough/03-today-empty.png) | ![Explore loaded](walkthrough/05-explore-loaded.png) | ![Guide](walkthrough/06-guide.png) | ![Voice default](walkthrough/07-voice-default.png) |

A fresh account: no takes yet, so `/today` shows the zero state rather than a fabricated pick. `/explore` pulls a live, real-time ranked feed — rank numbers, top three set larger, "Related to what you've written" reasoning shown per item. `/guide` and `/you` are the reference and the personalization surfaces, both untouched at this point.

---

## The core loop: Think → Studio → Track record

### 1 · Break it down

| Empty | Typed | Breaking it down |
|---|---|---|
| ![Think empty](walkthrough/08-think-empty.png) | ![Input typed](walkthrough/09-think-input-typed.png) | ![Loading](walkthrough/10-think-loading.png) |

The "Break it down" button is outlined and unavailable until there's real input — no muddy half-opacity amber. The moment there's text, it fills.

### 2 · The breakdown — grounded, with receipts

| Synthesis | Full breakdown |
|---|---|
| ![Synthesis](walkthrough/11-think-synthesis.png) | ![Breakdown expanded](walkthrough/12-think-breakdown-expanded.png) |

Crux fetched the actual Wikipedia page — the "Grounded in the source" badge is real, not decorative. The plain-English summary sits on a paper `Plate`; underneath, four structured rows (what happened, new vs. repackaged, the key debate, the skeptic's case) plus verified receipts — quotes checked word-for-word against the fetched text, with a per-quote stamp.

### 3 · Your take, then back to the receipts

| Take typed | Breakdown reopened |
|---|---|
| ![Take typed](walkthrough/13-think-take-typed.png) | ![Breakdown reopened](walkthrough/14-think-breakdown-reopened.png) |

Once there's a take, the full breakdown auto-collapses — the app assumes you've moved from reading to deciding. Reopening it (the "Read the full breakdown" toggle) shows the receipts again for reference before committing.

### 4 · Talk it through — Coach, then Spar

| Coach arrives | I reply | The exchange |
|---|---|---|
| ![Coach initial](walkthrough/16-think-coach-initial.png) | ![Coach reply typed](walkthrough/17-think-coach-reply-typed.png) | ![Coach exchange](walkthrough/18-think-coach-exchange.png) |

Coach opens by naming what's worth noticing in my take and asks a real clarifying question — *"Which of those matters most for your product: cost per query, freshness/size of the knowledge base, or factual reliability?"* I answered with the evidence (token costs down ~10x, most internal corpora under 1M tokens); Coach responded with genuine follow-up angles rather than a verdict.

| Switched to Spar | I push back | The exchange |
|---|---|---|
| ![Spar switch](walkthrough/19-think-spar-switch.png) | ![Spar reply typed](walkthrough/20-think-spar-reply-typed.png) | ![Spar exchange](walkthrough/21-think-spar-exchange.png) |

Spar takes the opposite role — *"against you, takes the strongest case for the other view"* — and it does: it names the real counter-argument (latency, freshness, access control) and closes with three hard, specific questions rather than a generic objection. Neither Coach nor Spar hands over a conclusion — that's the product's whole premise, and it held up under a real conversation.

### 5 · Write it up — the commit step

| Loading | The take on paper | Confidence, with odds | Depth filled |
|---|---|---|---|
| ![Commit loading](walkthrough/22-think-commit-loading.png) | ![Commit take](walkthrough/23-think-commit-take.png) | ![Commit confidence](walkthrough/24-think-commit-confidence.png) | ![Commit detail](walkthrough/25-think-commit-detail.png) |

"Write up my take" runs the whole conversation through a real model call that organizes *my own* words into a sharpened statement and drafts the depth fields — it doesn't invent a new opinion. The take sits on a `Plate`, not in a form field. Confidence shows the actual odds (`~60%` for Med) and states what that claim means in plain terms, not just a label.

![Saved](walkthrough/26-think-saved-stamp.png)

### 6 · The carousel

| Generating | The deck | A different style | Editing |
|---|---|---|---|
| ![Studio loading](walkthrough/27-studio-loading.png) | ![Studio generated](walkthrough/28-studio-generated.png) | ![Style changed](walkthrough/29-studio-style-changed.png) | ![Edit panel](walkthrough/30-studio-edit-panel.png) |

The generated deck is genuinely sharp copy — *"RAG is no longer the automatic default. It is a design choice — and sometimes the heavier one."* Twelve named design worlds are swatched, not a row of unlabelled circles; picking a different one is instant. The right rail groups content, style and layout for the selected slide.

| Export | Saved |
|---|---|
| ![Export menu](walkthrough/31-studio-export-menu.png) | ![Saved](walkthrough/32-studio-saved.png) |

### 7 · Library and Track record

| Library | New take | Expanded | Scored |
|---|---|---|---|
| ![Gallery](walkthrough/33-gallery.png) | ![Ledger new](walkthrough/34-ledger-new-take.png) | ![Ledger expanded](walkthrough/35-ledger-expanded.png) | ![Ledger scored](walkthrough/36-ledger-scored.png) |

The saved deck lands in the Library. On the Track record, the new take shows its confidence, its source, and — because receipts were verified upstream — a lineage line (*"4 verified receipts"*). Expanding it surfaces the evidence, the steelman, and the falsifier I wrote (*"a well-run benchmark showed long-context-only answers beating RAG..."*) — the standing invitation to come back and check. Marking it **Held Up** immediately moves the calibration chart: one real point plotted against the confidence I claimed.

### 8 · Back to Today, and personalizing You

| Today, updated | Brand kit set | A real writing sample |
|---|---|---|
| ![Today updated](walkthrough/37-today-updated.png) | ![Brand kit](walkthrough/38-voice-brandkit.png) | ![Sample typed](walkthrough/39-voice-sample-typed.png) |

Today now shows the streak and "Revisit your thinking." On `/you`, setting a handle and adding a writing sample is what makes future carousels sound like the account's own voice rather than a generic default.

### Command palette, and mobile

| ⌘K | Mobile Today | Mobile Think | Mobile Studio |
|---|---|---|---|
| ![Command palette](walkthrough/40-command-palette.png) | ![Mobile today](walkthrough/41-mobile-today.png) | ![Mobile think](walkthrough/42-mobile-think.png) | ![Mobile studio](walkthrough/43-mobile-studio.png) |

---

## What this run actually verified

Everything above happened against the real pipeline — a real page fetch, real synthesis, two real adversarial chat turns, a real commit-suggest call, and real carousel generation. Nothing here is seeded fixture data (that's what `web/tests/capture.spec.ts` is for — deterministic marketing screenshots from a fixed account). This is what a first-time user's actual first session looks like, end to end.
