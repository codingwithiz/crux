import Link from "next/link";

export const metadata = { title: "Not found — Crux" };

/** Routes have moved twice (/news → /explore, /queue deleted), so an old
 *  bookmark landing here should offer somewhere to go rather than a dead end. */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start px-5 py-24">
      <p className="font-mono text-xs uppercase tracking-eyebrow text-accent">404</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
        There&rsquo;s nothing here.
      </h1>
      <p className="mt-3 text-muted">
        This page doesn&rsquo;t exist, or it moved. A few places that do:
      </p>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {[
          ["/today", "Today"],
          ["/explore", "Explore"],
          ["/think", "Think"],
          ["/ledger", "Ledger"],
          ["/guide", "How it works"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-control border border-line px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
          >
            {label} →
          </Link>
        ))}
      </div>
    </div>
  );
}
