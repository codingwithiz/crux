import Link from "next/link";
import type { ComponentType } from "react";

/** A friendly, on-brand empty state that doubles as an onboarding nudge. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-surface border border-dashed border-line bg-surface/30 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-control border border-line bg-surface text-accent">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {cta && (
        <Link
          href={cta.href}
          // Matches Button's primary variant, including the printed-ink press —
          // the empty-state CTA is the one action on the screen and used to be
          // the only primary in the app that sat flat.
          className="ce-press mt-5 inline-flex items-center gap-1.5 rounded-control bg-accent px-4 py-2 text-sm font-medium text-accent-fg shadow-press transition hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
