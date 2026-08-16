import type { ReactNode } from "react";

/**
 * Paper.
 *
 * The app is ink and the user's work is paper. A `Card` is chrome — a panel the
 * product puts around something. A `Plate` is the thing itself: a take, a
 * synthesis, a verified quote, a deck.
 *
 * Crux exports genuinely beautiful editorial carousels and then displayed them,
 * and everything that led to them, on the same flat grey as the settings form.
 * The material here is lifted straight from `lib/carousel/design.ts` — same
 * gradient, same grain, same ink — so a take on screen and the slide it becomes
 * are made of the same stock.
 *
 * Use it sparingly: one plate per viewport. Warmth everywhere reads as cosy,
 * not crafted, and a page of paper is just a page of cards again.
 */
export function Plate({
  arrive = false,
  className = "",
  children,
}: {
  /** Play the arrival — a settle with the cast shadow blooming in. For a plate
   *  that appears in response to something the user did, not on page load. */
  arrive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <div className={`ce-plate ${arrive ? "ce-arrive" : ""} p-6 ${className}`}>{children}</div>;
}

/** A mono label for use on paper — the eyebrow above a plate's headline.
 *  Muted paper ink, not the app's muted grey, which vanishes on light stock. */
export function PlateLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-micro uppercase tracking-eyebrow text-paper-muted ${className}`}
    >
      {children}
    </p>
  );
}
