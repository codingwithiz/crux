---
name: Crux
description: Ink and paper — the chrome recedes, the user's own work has weight.
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
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.16em"
  micro:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
rounded:
  control: "8px"
  surface: "14px"
  plate: "20px"
  full: "999px"
  code: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
    typography: "{typography.body}"
  button-primary-inert:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
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

# Design

## Overview

**Creative North Star: "Ink and Paper."**

Crux exports genuinely editorial carousels — warm paper stock, grain, oversized serif headlines, marker highlights, hand-drawn underlines and arrows. For most of its life the application around that looked like every other dark AI dashboard, so the one thing that was distinctly its own lived only inside the artifact it produced.

The system has two materials and they are not a lightness ramp. **Ink** is chrome: navigation, forms, controls, panels. It is near-black, cool, flat, and it recedes — you should be able to stop seeing it. **Paper** is the user's own work: a take, a breakdown, a verified quote, a deck. It is warm, grained, raised, and it casts a real shadow. The values are lifted verbatim from `lib/carousel/design.ts`, so a take on screen and the slide it becomes are made of the same stock.

This is defensible because it is built from an asset only Crux has. A competitor can copy a gradient; they cannot copy the carousel engine. Restraint is what keeps it premium: **one paper plate per viewport**. Warmth everywhere reads as cosy, and a page of paper is just a page of cards again.

**Key Characteristics:**

- Two materials, ink and paper, never blended into one grey ramp
- Editorial serif for anything that carries a point; sans for the interface; mono for measurement and labels
- The carousel's print language — marker, squiggle, hand-drawn arrow, grain — is the accent vocabulary, used instead of adding more bordered rectangles
- Letterpress rather than float: the page-level primary presses into the surface
- One authored motion moment per surface; everything else is feedback
- Dark-only, by decision, not by omission

## Colors

`ink` is the ground. `surface` / `surface-2` / `surface-3` are the three chrome elevations and `line` is the only border colour in the app (`* { border-color: var(--color-line) }`).

**Primary — `accent` `#f4b740`.** Amber. Reserved for the single primary action on a screen, the eyebrow that names a metric, and the marker. It is deliberately *not* the focus ring: the ring used to be amber, which is also the primary fill and the selected-chip tint, so on every selected control the focus outline was invisible against the thing it was ringing.

**Secondary — `cool` `#8aa2ff`.** Two roles, both non-primary. *Recall:* "related to what you've written", "revisit your thinking", and the focus ring (`ring`). *Optional AI assist:* "Stuck? Get hints", "Draft from what I argued", "Rewrite in my voice" — the actions where the model does work you did not have to ask for. Never the page's primary action, and never a second amber.

**The Assist Rule.** A cool-tinted control means the model is about to do optional work on your behalf. It reads as an offer, not an instruction, which is why it must never be the loudest thing on the screen — the amber primary is the path, and cool is the shortcut you may ignore.

**Functional — `success` `#34d399`, `warning` `#fbbf24`, `danger` `#f87171`.** State only, each with a matching dark `-fg` for use as a fill.

**Paper — `paper` `#f4f0e8`, `paper-2` `#fbf9f3`, `paper-fg` `#1b1714`, `paper-muted` `#736c61`.** Only on artifacts. Paper carries its own foreground and muted values; the ink `muted` grey is illegible on it.

**The Tinted Surface Rule.** Secondary text on a coloured surface is tinted from that hue or from the surface's own foreground — never the neutral `muted` grey. Grey on an amber-tinted panel reads as a rendering mistake.

**The Reserved Saturation Rule.** Full saturation belongs to calls to action and status. Greys carry the rhythm. If two things on a screen are amber, one of them is wrong.

## Typography

Three families, each with a job. **Newsreader** (serif) is editorial: page titles, headlines, opinion statements, pull quotes. **Geist Sans** is the interface and all body copy. **Geist Mono** is measurement — labels, data, keyboard hints, code.

**The Monospace Rule.** Mono means code, data, or measurement. It is never a costume for "technical". A mono label that names a metric or a date is measurement and belongs; a mono label used for texture does not.

### Hierarchy

| Step | Use |
|---|---|
| `display` 2.75rem serif | One per page. The page's own title or a hero headline. |
| `title` 1.875rem serif | Section heads and the headline on a plate. |
| `lead` 1.25rem sans | The single sentence under a page title. Not every paragraph. |
| `body` 0.875rem sans, line-height 1.6 | Everything else. |
| `label` 0.75rem mono, uppercase, `0.16em` | Eyebrows and data labels. One tracking value; there used to be two. |
| `micro` 0.6875rem sans | The floor. Nothing in the app is smaller. |

**The Name-or-Delete Rule.** An eyebrow above a heading stays only when it *names* something the heading does not — a metric (`ACCURACY` over `97/100`), a card type (`TODAY'S PICK`), or a date (`WEDNESDAY, 12 AUG`). An eyebrow that decorates or restates the heading is deleted: `CRUX` above the hero says nothing to someone already on the site, and `your work` above `Library` is the same word twice. This is a deliberate, narrow exception to the general guidance that eyebrows are always slop — the print language is genuinely Crux's, but only where the label carries information.

**The Measure Rule.** Body text sits at 65–75 characters. Left unbounded the pages ran past 90ch and read as documentation rather than product.

## Layout

A 4px spacing rhythm. Content columns are measure-bounded, not viewport-bounded: at 1920px a single centred 730px column leaves most of the screen empty, so wide viewports get a second column of real content — list plus reading pane, list plus detail — rather than a wider paragraph.

Breakpoints are Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536). Every surface is designed at 390 and 1440 at minimum.

Spacing is grouped, not even: tight within a group, generous between groups, and more space above a heading than below it.

## Elevation & Depth

Three shadows, by role. `raised` is a chrome panel pulled out of a stack. `plate` is paper resting on ink — a tight contact shadow plus a wide soft one, which is what makes it read as an object. `press` is the letterpress.

**The Letterpress Rule.** The page-level primary action carries a hard 2px offset shadow in `accent-fg` that collapses on `:active`, so the control behaves like something stamped down. This is earned by the world — the world is print, and letterpress leaves an impression — but it is **rationed to one control per screen**. On every button in a row it stops meaning "press me" and becomes texture, which is exactly when a block shadow turns into a costume. Row actions and secondary controls are flat.

**The Contact Rule.** Every shadow has an offset and a soft blur. A zero-offset coloured halo is decoration, not depth. The letterpress is the single, named exception.

## Shapes

Three box radii, by role, replacing the seven that were in use:

- `control` 8px — buttons, inputs, small icon tiles
- `surface` 14px — cards, panels, dialogs, empty states
- `plate` 20px — paper artifacts only

Two more that are not box radii and do not count against that three:

- `full` 999px — things that are fully round because they are pills, not boxes: filter chips, starter chips, status dots, scrollbar thumbs
- `code` 4px — inline `code` inside prose, and nothing else. At `control` an inline span reads bulbous.

Grain, at low opacity, sits on both materials: `screen` blend on ink, `multiply` on paper. One definition (`--ce-grain`) serves both.

**Outside this system, on purpose.** Two files are exempt from the token rules and are listed in `.impeccable/config.json` under `detector.ignoreFiles`, which stores globs and cannot hold the reason:

- `web/components/carousel/SlideCanvas.tsx` — the export renderer. It paints from `lib/carousel/design.ts`, which is its own complete design system of twelve colour worlds; the on-screen preview *is* the exported PNG, so its values must be the deck's, not the app's.
- `web/lib/carousel/logos.tsx` — third-party brand logos. `#336791` is PostgreSQL's blue; a brand mark rendered in an approximate colour is wrong.

## Components

### Buttons

`primary` is amber with the letterpress, one per screen. `secondary` is a hairline outline. `ghost` is text. `danger` is an outline in `danger`.

**The Unavailable Rule.** A disabled primary drops to an outline — transparent fill, `muted` text, a 1px ring — it does not dim. Amber at 50% opacity on near-black is a muddy olive that still reads as a filled, pressable button. A *loading* button is not unavailable: it keeps its fill and gains a spinner, because it is still the page's primary action.

### Cards / Containers

`Card` is chrome, `rounded-surface`, a `line` hairline, `surface/40` fill, four tones (default, accent, cool, muted) and a `feature` flag for the one panel on a screen that should be seen first.

Nested cards are always wrong. A row of same-size cards, each an icon plus a heading plus two lines of grey text, is not page structure — it is the absence of one.

### Inputs / Fields

`rounded-control`, `ink` fill, `line` border, border goes `accent` on focus. Base size is 16px dropping to 14px at `sm` and above, deliberately: anything smaller triggers iOS zoom-on-focus.

### Navigation

Sticky, 56px, `ink/80` with a backdrop blur, one `line` hairline beneath. The active item is a filled `surface` pill.

### Plate (signature)

The paper artifact surface. Warm gradient, grain at `multiply`, `rounded-plate`, the `plate` shadow, and it re-points the accent language at paper ink: the squiggle underline and the caret both become `paper-fg` inside it. Reach for `Plate` for anything the user made; reach for `Card` for anything the product put around it.

### Print language (signature)

`ce-marker` is an opaque marker sweep behind a phrase — a real highlighter is not translucent, and a semi-transparent yellow over dark ground muddies to olive and reads as a redaction bar. `ce-underline` is a hand-drawn squiggle, drawn as a mask so its colour is a token. `ce-rule` is a 2px broadsheet rule above a section. Used sparingly on purpose: a highlighter that touches everything highlights nothing.

### Motion

Durations: `110ms` immediate feedback, `160ms` hover and focus, `260ms` routine state change, `420ms` layout and arrival, `700ms` the one authored moment. Easing is exponential deceleration, `cubic-bezier(0.16, 1, 0.3, 1)`. Exits are faster than entrances.

**The One Moment Rule.** Each surface gets one authored sequence, chosen because something real is happening — understanding assembling, a take being stamped, a quote verifying. Everything else is feedback. An identical fade-and-rise on every section is not a motion thesis.

**The Reduced Motion Rule.** Every animation has a `prefers-reduced-motion` path that reduces movement while keeping the meaning: opacity, colour, and state changes survive; spatial movement and sequencing do not. `animation-delay` is zeroed too, or a stagger still arrives a second apart.

**The Visible Default Rule.** Content is rendered visible and *armed* by script, never hidden by default and revealed by script. A failed effect must not hide the page.

### Browser surfaces

Selection, caret, scrollbars, the focus ring, and tabular numerals are all part of the system. Selection is `accent` on `accent-fg`; the caret is `accent` on ink and `paper-fg` on paper; scrollbars are 10px with a `surface-2` thumb; the focus ring is a 2px `ring` outline at 2px offset on `:focus-visible` only. Figures that sit in a column or change in place use tabular numerals, so a score moving 97 → 100 does not shuffle everything beside it.

## Do's and Don'ts

### Do:

- Use `Plate` for the user's work and `Card` for the product's chrome; keep it to one plate per viewport
- Keep an eyebrow only when it names a metric, a card type, or a date
- Ration the letterpress to the one page-level primary
- Tint secondary text on a coloured surface from that hue, never neutral grey
- Bound body text to 65–75 characters
- Give each surface exactly one authored motion moment, chosen because something real happened
- Theme the browser's own surfaces — caret, selection, scrollbars, focus ring, numerals
- Reach past transform and opacity: blur, mask, clip-path, and shadow are part of the motion palette
- Show the product's own measurement — the eval scores and the calibration curve — rather than asserting quality

### Don't:

- Don't use an eyebrow that decorates or restates the heading
- Don't put the letterpress on row actions, secondary buttons, or more than one control per screen
- Don't dim a disabled primary to muddy amber; drop it to an outline
- Don't build a page out of a row of same-size icon-heading-text cards, and never nest cards
- Don't use monospace as a costume for "technical" — only for code, data, or measurement
- Don't add a second saturated accent to a screen that already has one
- Don't use gradient text, or glass and blur as decoration rather than as a specific effect
- Don't use emoji or Unicode glyphs as icons; icons are drawn SVGs from `lucide-react`
- Don't use bounce or elastic easing
- Don't animate a static area merely because it exists, and don't repeat one entrance on every section
- Don't add a motion dependency for something CSS expresses cleanly
