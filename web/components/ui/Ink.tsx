import type { ReactNode } from "react";

/**
 * The app's print voice.
 *
 * Crux exports editorial carousels — paper grain, marker highlights, hand-drawn
 * underlines, serif display type — and for its whole life the chrome around
 * that looked like any other dark dashboard. Nothing about the product was
 * visible in the product. These are the pieces of that language, small enough to
 * use without ceremony and deliberately few, because a highlighter that touches
 * everything highlights nothing.
 */

/** A marker sweep behind a phrase. Use once per screen, on the phrase that
 *  carries the point. */
export function Mark({
  children,
  tone = "yellow",
  className = "",
}: {
  children: ReactNode;
  tone?: "yellow" | "pink";
  className?: string;
}) {
  return (
    <span className={`ce-marker ${tone === "pink" ? "ce-marker-pink" : ""} ${className}`}>
      {children}
    </span>
  );
}

/** A hand-drawn underline. `draw` animates it in — reserved for the moment a
 *  take is saved, so the gesture means something when it appears. */
export function Underline({
  children,
  draw = false,
  className = "",
}: {
  children: ReactNode;
  draw?: boolean;
  className?: string;
}) {
  return (
    <span className={`ce-underline ${draw ? "ce-underline-draw" : ""} ${className}`}>{children}</span>
  );
}

/**
 * A section head: a small mono eyebrow over a broadsheet rule.
 *
 * Every surface had grown its own arrangement of an uppercase mono label and a
 * heading, at four different sizes; this is that pattern named once. `rule`
 * defaults on because the rule is what makes the page read as a printed thing
 * rather than a stack of cards.
 */
export function SectionHead({
  eyebrow,
  title,
  children,
  rule = true,
  tone = "accent",
  className = "",
}: {
  eyebrow?: string;
  title?: ReactNode;
  /** Trailing content — an action, a count — pushed to the right of the title. */
  children?: ReactNode;
  rule?: boolean;
  tone?: "accent" | "cool" | "muted";
  className?: string;
}) {
  const toneClass = tone === "cool" ? "text-cool" : tone === "muted" ? "text-muted" : "text-accent";
  return (
    <div className={`${rule ? "ce-rule pt-4" : ""} ${className}`}>
      {eyebrow && (
        <p className={`font-mono text-xs uppercase tracking-[0.14em] ${toneClass}`}>{eyebrow}</p>
      )}
      {(title || children) && (
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          {title && <h2 className="font-serif text-title font-semibold">{title}</h2>}
          {children}
        </div>
      )}
    </div>
  );
}
