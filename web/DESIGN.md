---
name: Crux
description: A dark editorial intelligence instrument where human thinking appears as warm paper artifacts inside quiet software.
colors:
  ink: "#0a0b0e"
  surface: "#14151b"
  surface-2: "#1c1e26"
  surface-3: "#242732"
  line: "#2a2e3a"
  fg: "#f3f4f6"
  muted: "#9499a6"
  accent: "#f4b740"
  accent-fg: "#1a1206"
  cool: "#8aa2ff"
  ring: "#8aa2ff"
  success: "#34d399"
  success-fg: "#052e23"
  warning: "#fbbf24"
  warning-fg: "#2a1a02"
  danger: "#f87171"
  danger-fg: "#2a0a0a"
  marker: "#fbe36b"
  marker-pink: "#f4c9c2"
  paper: "#f4f0e8"
  paper-2: "#fbf9f3"
  paper-fg: "#1b1714"
  paper-muted: "#736c61"
typography:
  display:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  lead:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  small:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  micro:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.16em"
rounded:
  control: "8px"
  surface: "14px"
  plate: "20px"
  full: "999px"
  code: "4px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
    typography: "{typography.small}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
    typography: "{typography.small}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.surface}"
    padding: "16px"
  plate:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-fg}"
    rounded: "{rounded.plate}"
    padding: "24px"
  input:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
---

# Crux — Visual Design System

**Status:** Production design direction  
**Version:** 1.0  
**Product:** Crux  
**Core idea:** *The AI scaffolds and expresses; the human forms the view and owns it.*

---

## 1. Design North Star

Crux is not an AI writing dashboard.

It is an **editorial intelligence instrument**: a place where a person reads, challenges, forms, records, and eventually publishes a point of view.

The interface must therefore feel closer to:

- an independent editorial publication
- a research notebook
- a high-end writing instrument
- a print artifact
- a modern software tool

and less like:

- an AI chatbot
- a generic SaaS dashboard
- a template marketplace
- a productivity app
- an "AI wrapper"

### The emotional target

When a user opens Crux, the reaction should be:

> "I am here to think."

Not:

> "I am here to use an AI tool."

### Design principles

1. **The thought is the hero.**
2. **The interface recedes; the user's thinking becomes prominent.**
3. **Evidence should feel tangible and traceable.**
4. **AI should feel like an instrument, not a character.**
5. **Artifacts should feel authored, not generated.**
6. **Editorial composition beats component density.**
7. **Asymmetry is allowed when it improves hierarchy.**
8. **Restraint creates trust.**
9. **Every decorative element must have a reason.**
10. **Do not optimize for "premium SaaS". Optimize for recognisable Crux.**

---

# 2. Visual World

## Two materials

Crux has two visual materials:

### INK — the application

The application chrome is dark, quiet, restrained, and functional.

- near-black ground
- cool dark surfaces
- thin rules
- muted text
- restrained amber
- occasional blue for interaction/focus

The chrome should recede.

### PAPER — the user's thinking

The user's:

- thesis
- synthesis
- evidence
- receipts
- carousel
- saved conviction

should feel like a physical editorial artifact sitting on the application.

Paper is:

- warm
- tactile
- slightly imperfect
- typographic
- materially distinct from the chrome

The transition between INK and PAPER is one of Crux's primary brand devices.

---

# 3. Brand Personality

Crux should feel:

- intelligent
- editorial
- skeptical
- confident
- curious
- slightly contrarian
- human
- precise
- understated

Crux should never feel:

- cute
- bubbly
- corporate
- futuristic for its own sake
- cyberpunk
- over-animated
- "AI magical"
- childish
- excessively minimal
- template-driven

---

# 4. Typography

Typography is a primary brand element.

## Families

### UI / Sans

Use Geist Sans.

Purpose:

- controls
- navigation
- metadata
- supporting copy
- functional UI

### Editorial / Serif

Use Newsreader.

Purpose:

- major statements
- thesis text
- editorial headlines
- pull quotes
- user-authored thinking
- major page introductions

### Technical / Mono

Use Geist Mono.

Purpose:

- eyebrows
- source labels
- evidence IDs
- confidence values
- timestamps
- technical metadata
- small editorial annotations

## Hierarchy

Use the existing semantic scale rather than arbitrary Tailwind sizes.

| Token | Size | Purpose |
|---|---:|---|
| display | 44px | hero thesis / major statement |
| title | 30px | page-level title |
| lead | 20px | introductory copy |
| body | 16px | normal reading |
| small | 14px | supporting UI |
| micro | 11px | metadata / eyebrows |

### Rules

- Never use more than three type families on one surface.
- Serif is for meaning, not decoration.
- Mono is for metadata, not paragraphs.
- Avoid all-caps except for short eyebrows.
- Never make every heading large.
- Large type must create hierarchy, not merely fill space.
- Long-form user thinking should generally use the serif face.

---

# 5. Color

## Core palette

```css
--color-ink: #0a0b0e;
--color-surface: #14151b;
--color-surface-2: #1c1e26;
--color-surface-3: #242732;
--color-line: #2a2e3a;

--color-fg: #f3f4f6;
--color-muted: #9499a6;

--color-accent: #f4b740;
--color-accent-fg: #1a1206;

--color-cool: #8aa2ff;
--color-ring: #8aa2ff;

--color-success: #34d399;
--color-warning: #fbbf24;
--color-danger: #f87171;
```

## Paper

```css
--color-paper: #f4f0e8;
--color-paper-2: #fbf9f3;
--color-paper-fg: #1b1714;
--color-paper-muted: #736c61;
--color-paper-line: rgba(27, 23, 20, 0.10);
```

## Marker

```css
--color-marker: #fbe36b;
--color-marker-pink: #f4c9c2;
```

### Color rules

- Amber is an accent, not a background.
- Blue is primarily interaction/focus.
- Green/red are semantic only.
- Do not introduce gradients as decoration.
- Do not introduce purple as an AI accent.
- Do not use a rainbow palette.
- Do not make every selected item amber.
- Paper should remain visually distinct from dark chrome.
- Color should communicate hierarchy, state, or editorial emphasis.

---

# 6. Shape Language

Crux deliberately uses fewer radii.

```css
--radius-control: 8px;
--radius-surface: 14px;
--radius-plate: 20px;
```

### Rules

- Controls: 8px.
- Panels: 14px.
- Paper/artifacts: 20px.
- Do not use pills unless the content is genuinely tag-like.
- Avoid `rounded-full` for ordinary buttons.
- Avoid excessive nested cards.
- A card inside a card inside a card is a design failure unless there is a strong semantic reason.

### Important

**Do not turn every section into a card.**

A section can be:

- open on the canvas
- separated by a rule
- offset by typography
- grouped by whitespace

before becoming a bordered rectangle.

---

# 7. Layout Philosophy

Crux uses **editorial composition**, not dashboard symmetry.

## Prefer

- asymmetrical columns
- large editorial margins
- strong left alignment
- deliberate whitespace
- rules
- oversized type
- variable density
- pull quotes
- offset metadata
- visual interruptions

## Avoid

- equal-sized cards in a grid everywhere
- centered content by default
- identical visual weight for every section
- excessive 3-column card layouts
- perfectly symmetrical dashboards
- every section beginning at the same visual scale

### Grid

Use a strong underlying grid, but allow content to break it.

Recommended desktop structure:

```text
┌────────┬──────────────────────────────┬──────────┐
│ gutter │ primary editorial canvas    │ context  │
│        │                              │          │
│        │                              │          │
└────────┴──────────────────────────────┴──────────┘
```

The grid should be invisible unless rules or alignment reveal it.

---

# 8. Surface Hierarchy

Every surface should have one of four levels:

### Level 0 — Canvas

The page itself.

No border.

### Level 1 — Group

A related set of content.

Use:

- spacing
- typography
- rule

before using a container.

### Level 2 — Surface

A distinct functional object.

Use:

- subtle background
- border
- 14px radius

### Level 3 — Artifact

Something the user owns.

Use:

- paper
- material shadow
- 20px radius
- editorial typography

Artifacts should visually dominate functional chrome.

---

# 9. Navigation

Primary navigation:

1. **Today**
2. **Explore**
3. **Think**
4. **Ledger**
5. **Studio**

Secondary destinations:

- Library
- Voice
- Settings
- Help

### Navigation principle

The navigation must communicate the Crux loop:

**Discover → Think → Commit → Express**

Do not make every destination look equally important.

### Think is the primary action

"Think" should be visually more prominent than ordinary navigation.

But it should not become a giant pill button.

---

# 10. Page-Specific Direction

## Today

Purpose:

> What deserves my attention today?

Design it like a daily editorial briefing.

Prioritize:

1. one dominant story
2. secondary stories
3. user's recent thinking
4. unresolved convictions

Avoid dashboard KPI blocks.

Instead of:

> 3 Takes / 0 This Week / 1 Revised

prefer editorial language:

> **YOUR THINKING**
>
> 3 convictions this week  
> 1 revised · 2 unresolved

Metrics should support the story, not become the story.

---

## Explore

Purpose:

> What is happening that I might care about?

Use:

- source provenance
- editorial ranking
- compact metadata
- strong headlines
- visible disagreement signals

Each story should communicate:

**Why this is here.**

Not simply:

**This is a story.**

---

## Think

This is the most important surface.

Purpose:

> Form a view.

It should feel like a writing room, not a form.

### Structure

```text
THINK

What do you actually believe?

[ unfinished thought ]

────────────────────────

WHAT THE SOURCES SAY

[ evidence ]

────────────────────────

WHERE IT BREAKS

[ disagreement / skeptic ]

────────────────────────

YOUR CRUX

[ user-owned thesis ]

                    82%
                  confidence

                  COMMIT →
```

### Rules

- Give the user's text the largest visual weight.
- Keep AI output visually subordinate.
- Make "your take" visually different from "what the sources say".
- Avoid chat-bubble UI unless the interaction genuinely requires conversation.
- Coach and Spar should feel like editorial instruments, not chatbot personas.
- The commit moment should feel deliberate.

---

## Ledger

Purpose:

> Remember what I believed.

The Ledger is the long-term differentiator.

Treat each conviction as an editorial record.

Each entry should expose:

- thesis
- confidence
- date
- evidence
- status
- outcome
- revisions

Use timeline and provenance patterns more than card grids.

A conviction should feel like a **record**, not a database row.

---

## Studio

Purpose:

> Express the thinking.

The artifact is the hero.

### Principle

**The editor chrome should disappear behind the work.**

Use:

- restrained controls
- compact toolbars
- large canvas
- strong paper artifact
- clear export controls

Avoid:

- oversized property panels
- excessive pills
- decorative controls
- generic design-tool chrome

The Studio should feel closer to an editorial desk than a generic Canva clone.

---

# 11. Evidence Language

Evidence should have a visual vocabulary.

Possible markers:

- `SOURCE`
- `PRIMARY`
- `SECONDARY`
- `SUPPORTS`
- `CONTRADICTS`
- `UNVERIFIED`
- `CHECKED`

Use Geist Mono.

Keep these small.

Evidence should feel precise, not loud.

### Citation principle

A verified quote should feel like a receipt.

An unverified quote should feel visibly uncertain.

Never visually imply certainty when the system has not established it.

---

# 12. Confidence

Confidence is meaningful data, not decoration.

Prefer:

```text
82%
CONFIDENCE
```

over a giant progress bar.

When a chart is appropriate, keep it restrained.

Avoid:

- neon radial gauges
- giant AI-style score rings
- gradient progress bars
- gamification

Confidence should feel like an editorial judgment.

---

# 13. Motion

Motion is authored, not automatic.

Tokens:

```css
--dur-instant: 110ms;
--dur-fast: 160ms;
--dur-base: 260ms;
--dur-slow: 420ms;
--dur-deliberate: 700ms;
```

Use:

- 110ms for press/toggle
- 160ms for hover/focus
- 260ms for ordinary transitions
- 420ms for layout/overlay
- 700ms for one meaningful authored moment

### Motion principles

- One memorable motion per surface is better than twenty tiny animations.
- Prefer entering/settling over bouncing.
- Never animate for decoration alone.
- No perpetual motion.
- No excessive spring physics.
- Respect reduced-motion preferences.

### Crux signature motion

A good signature is:

**fade + slight vertical movement + settle**

not:

**bounce + scale + glow + blur + gradient**.

---

# 14. Texture

Grain is part of the Crux identity.

Use it sparingly.

The grain should:

- make surfaces feel material
- connect chrome and paper
- prevent the dark background from feeling sterile

It must never:

- reduce text contrast
- become visible noise
- distract from content

---

# 15. Editorial Devices

Approved:

- marker highlights
- hand-drawn rules
- underlines
- marginal notes
- oversized numerals
- pull quotes
- source stamps
- paper edges
- subtle grain
- editorial labels

Use these as punctuation.

### Rule

If every paragraph has a marker, there is no marker.

---

# 16. Components

## Button

Primary:

- amber
- dark text
- 8px radius
- restrained press
- no gradient

Secondary:

- transparent/dark surface
- thin border
- muted text

Avoid:

- pill buttons
- glowing buttons
- gradient buttons
- giant CTAs inside the app

## Input

Inputs should feel like writing surfaces.

Prefer:

- generous vertical padding
- clear focus
- quiet border
- strong typography

Avoid:

- floating labels everywhere
- excessive helper text
- chat input styling for non-chat experiences

## Card

Cards are reserved for actual objects.

Never use a card simply because the content needs grouping.

## Dialog

Dialogs should feel like a sheet of paper over the workspace.

Avoid excessive glassmorphism.

---

# 17. Empty States

Never use:

> Nothing here yet.

Instead, explain the intellectual state.

Examples:

> **No convictions yet.**
>
> Start with something you can't quite agree with.

or:

> **Your Ledger is quiet.**
>
> Give yourself something worth being wrong about.

Empty states should reinforce Crux's philosophy.

---

# 18. Copy Style

Crux copy should be:

- concise
- intelligent
- direct
- slightly editorial
- occasionally provocative
- never corporate

Prefer:

> **What do you actually believe?**

over:

> Enter your opinion to begin the AI-assisted analysis workflow.

Prefer:

> **Spar with it.**

over:

> Generate counterarguments.

Prefer:

> **Commit this take**

over:

> Save thesis.

Avoid:

- "Unlock"
- "Supercharge"
- "Leverage AI"
- "10x"
- "magic"
- "AI-powered"
- "seamless"
- "next-generation"
- "intelligent automation"

unless technically necessary.

---

# 19. Accessibility

Visual personality must never reduce usability.

Requirements:

- WCAG AA contrast for ordinary text
- visible keyboard focus
- reduced-motion support
- semantic headings
- labels for controls
- keyboard-accessible dialogs
- no color-only status indicators
- minimum practical touch targets on mobile

The editorial layer is expressive; the interaction layer remains conventional.

---

# 20. Responsive Behavior

Do not simply shrink desktop.

On mobile:

- navigation becomes compact
- paper artifacts remain visually dominant
- metadata collapses
- secondary evidence moves below primary thinking
- Studio controls become contextual
- avoid horizontal desktop-style property panels
- preserve typography hierarchy

The mobile version should feel like a pocket notebook, not a compressed dashboard.

---

# 21. Anti-Patterns — Absolute Bans

Do not introduce these unless there is an explicit product reason:

- purple/blue AI gradients
- glassmorphism
- excessive blur
- glowing borders
- neon accents
- excessive pills
- giant rounded cards
- card-grid-everything
- chatbot bubbles for ordinary workflows
- generic AI sparkle icons
- excessive emoji
- decorative 3D blobs
- floating gradient orbs
- dashboard KPI walls
- rainbow data visualizations
- excessive drop shadows
- arbitrary font sizes
- more than three type families
- unnecessary badges
- "AI" labels everywhere
- generic "✨" treatment
- animated gradients
- excessive spring/bounce animation
- visual noise pretending to be personality

If a design decision makes Crux look more like a generic AI SaaS product, reject it.

---

# 22. Decision Test

Before shipping a UI change, ask:

### 1. Does this make the user's thinking clearer?

If no, reconsider.

### 2. Does this strengthen Crux's identity?

If no, it should be neutral at most.

### 3. Does this look like something every AI SaaS product could ship?

If yes, redesign it.

### 4. Is the AI visually louder than the human?

If yes, reduce it.

### 5. Is this component necessary?

If no, remove it.

### 6. Does the interface feel authored?

If no, introduce composition, typography, material, or hierarchy rather than more decoration.

---

# 23. Implementation Strategy

Do not redesign the entire application at once.

Priority order:

1. App shell / navigation
2. Think
3. Today
4. Ledger
5. Studio chrome
6. Explore
7. secondary surfaces
8. mobile refinement

The carousel visual system itself is already one of Crux's strongest identity assets. Preserve it and make the application chrome feel like it belongs to the same world.

---

# 24. Quality Bar

The final interface should pass this test:

> Remove the logo.

Can someone still identify the product as Crux?

If not, the visual identity is not strong enough.

A second test:

> Screenshot only the main workspace.

Does it look like a generic AI SaaS dashboard?

If yes, continue redesigning.

A third test:

> Screenshot only the user's thesis.

Does it look authored and important?

If yes, the system is working.

---

# 25. The One-Sentence Design Direction

**Crux is a dark editorial intelligence instrument where human thinking appears as warm paper artifacts inside quiet software.**

---

# 26. Implementation notes

Everything above is the direction. This section records where the machine-readable
frontmatter carries more than §4-§6 state in prose, so the difference is documented rather
than silent. The frontmatter is read by the Impeccable detector to validate tokens in code.

## Two radii beyond the three box radii

§6 names three **box** radii — `control` 8px, `surface` 14px, `plate` 20px — and those are
the only ones a panel, control or artifact may use. The frontmatter carries two more:

- `full` 999px — for genuinely tag-like content only, which §6 explicitly permits
  ("Do not use pills unless the content is genuinely tag-like"). Status badges, filter
  chips, and the scrollbar thumb. **Not for ordinary buttons**, per §16.
- `code` 4px — inline `<code>` inside prose, and nothing else. At `control` an inline span
  reads bulbous.

## Files outside the token system, on purpose

Listed in `.impeccable/config.json` under `detector.ignoreFiles`, which stores globs and
cannot hold the reason:

- `web/components/carousel/SlideCanvas.tsx` — the export renderer. It paints from
  `lib/carousel/design.ts`, its own complete design system of twelve colour worlds; the
  on-screen preview *is* the exported PNG, so its values must be the deck's, not the app's.
  §23 names this system as one of Crux's strongest identity assets and says to preserve it.
- `web/lib/carousel/logos.tsx` — third-party brand logos. `#336791` is PostgreSQL's blue;
  a brand mark rendered in an approximate colour is wrong.

## Interaction rules carried forward

These were established in the previous pass, are compatible with the direction above, and
should not be regressed:

**The Unavailable Rule.** A disabled primary drops to an outline — transparent fill, muted
text, a 1px ring — it does not dim. Amber at 50% opacity on near-black is a muddy olive
that still reads as a filled, pressable button. A *loading* button is not unavailable: it
keeps its fill and gains a spinner, because it is still the page's primary action.

**The Visible Default Rule.** Content is rendered visible and *armed* by script, never
hidden by default and revealed by script. A failed effect must not hide the page.

**The Tinted Surface Rule.** Secondary text on a coloured surface is tinted from that hue
or from the surface's own foreground — never the neutral `muted` grey. Grey on an
amber-tinted panel reads as a rendering mistake.

**The Assist Rule.** A cool-tinted control means the model is about to do optional work on
your behalf. It reads as an offer, not an instruction, which is why it must never be the
loudest thing on the screen — the amber primary is the path, cool is the shortcut you may
ignore. Consistent with §5's "Blue is primarily interaction/focus".

**The Measure Rule.** Body text sits at 65-75 characters (`.ce-measure`, 68ch). Left
unbounded the pages ran past 90ch and read as documentation rather than product.
