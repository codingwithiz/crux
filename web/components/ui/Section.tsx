import type { ReactNode } from "react";

/**
 * An editorial section: a rule, a mono label, then the content.
 *
 * The app's section heads were `<p>` elements styled as mono eyebrows, so pages
 * with five sections had a document outline of exactly one heading — a
 * composition problem and an accessibility one at the same time. This is a real
 * `<h2>` that happens to look like an eyebrow.
 *
 * The rule above it is the separator. Sections separated by rules read as a
 * composed page; the same content in bordered boxes reads as a list of widgets,
 * which is what DESIGN.md §7 is asking us to stop doing.
 */
export function Section({
  label,
  aside,
  className = "",
  labelClassName = "",
  children,
}: {
  label: string;
  /** Set to the right of the label — a count, a state, a link. Never a control
   *  that competes with the section's own content. */
  aside?: ReactNode;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={`border-t border-line pt-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={`font-mono text-micro uppercase tracking-eyebrow text-muted ${labelClassName}`}>
          {label}
        </h2>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
