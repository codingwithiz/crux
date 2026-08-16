import type { ReactNode } from "react";

/**
 * The top of a surface.
 *
 * Six pages had each grown their own version of the same thing: an `h1` at
 * `text-3xl` — a size not on the ramp, and the same size as a section head one
 * scroll down — followed by two or three sentences explaining what the page was
 * for. Explaining is what a page does when it doesn't show.
 *
 * So: the title at `display`, once per page, and a single line under it. If the
 * lead needs three sentences, the page is doing too much.
 */
export function PageHeader({
  title,
  lead,
  eyebrow,
  children,
}: {
  title: string;
  lead?: ReactNode;
  /** Only when it names something the title does not — a date, a count, a card
   *  type. A kicker that restates the heading is deleted, not styled. */
  eyebrow?: string;
  /** Actions that belong beside the title rather than under it. */
  children?: ReactNode;
}) {
  return (
    <header className="mb-8">
      {eyebrow && (
        <p className="font-mono text-xs uppercase tracking-eyebrow text-accent">{eyebrow}</p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-display font-semibold">{title}</h1>
        {children}
      </div>
      {lead && <p className="ce-measure mt-3 text-lead text-muted">{lead}</p>}
    </header>
  );
}
