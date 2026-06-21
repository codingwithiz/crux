# Crux — Brand & Design System

The one promise: **It doesn't write your posts. It makes you someone worth reading.**
Anti-slop is the soul — the AI sharpens *your* opinion, it never authors it.

## Voice & tone
- Plain, concrete, a little dry. Short declarative sentences. No hype words
  ("revolutionary", "delve", "leverage", "landscape", "unlock").
- Confident but earned — show the reasoning, name the trade-off.
- Talk *to* a smart peer, not down to a beginner. Define a term in a few words if you must use it.

## Color tokens (`web/app/globals.css`)
| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#0a0b0e` | app background |
| `surface` / `surface-2` / `surface-3` | `#14151b` … `#242732` | cards, elevation |
| `line` | `#2a2e3a` | borders |
| `fg` / `muted` | `#f3f4f6` / `#9499a6` | text |
| `accent` / `accent-fg` | `#f4b740` / `#1a1206` | the amber brand accent + on-accent text |
| `cool` | `#8aa2ff` | secondary / "related" |
| `success` / `warning` / `danger` | `#34d399` / `#fbbf24` / `#f87171` | functional states |

Reserve full saturation for CTAs and status; let greys carry the rhythm.

## Type
- **Geist Sans** — UI + body. **Geist Mono** — kickers, labels, code.
- **Newsreader (serif)** — editorial moments only: landing hero, opinion statements, pull-quotes.
- Body line-height ~1.6 on dark; off-white text, not pure white.

## Layout & motion
- 4px spacing rhythm; radius `lg` (12px) default, `2xl` for featured cards.
- Motion 150–300ms (`.ce-lift` hover, `.ce-press` tap, `.ce-fade-up` enter); always respects
  `prefers-reduced-motion`. One primary CTA per screen.
- Icons: **lucide-react** SVGs only — never emoji.
- Visible `:focus-visible` ring (amber) on every interactive element.

## Logomark
An amber rounded-square tile with a dark **crosshair** — "get to the crux" (`web/components/Logo.tsx`,
`web/app/icon.svg`). Pairs with the **Crux** wordmark.
