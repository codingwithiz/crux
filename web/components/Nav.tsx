import Link from "next/link";
import { SettingsButton } from "./SettingsButton";
import { AuthButton } from "./AuthButton";

const links = [
  { href: "/today", label: "Today" },
  { href: "/brief", label: "Brief" },
  { href: "/think", label: "Think" },
  { href: "/news", label: "News" },
  { href: "/studio", label: "Studio" },
  { href: "/gallery", label: "Gallery" },
  { href: "/voice", label: "Voice" },
  { href: "/ledger", label: "Ledger" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />
          Conviction<span className="text-muted">Engine</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
          <SettingsButton />
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
