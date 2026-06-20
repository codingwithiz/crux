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
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface/30 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-accent">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {cta && (
        <Link
          href={cta.href}
          className="ce-press mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
