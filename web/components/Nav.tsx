"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, HelpCircle, Search } from "lucide-react";
import { SettingsButton } from "./SettingsButton";
import { AuthButton } from "./AuthButton";
import { LogoMark } from "./Logo";

/**
 * Five surfaces, named for what you came to do — catch up, find something worth
 * thinking about, think, make, keep score. The previous Create▾/Library▾ grouping
 * organized the app around content artifacts instead, which meant every visit
 * started by translating an intent into a noun. Flattening also retires the
 * dropdowns, whose keyboard behaviour was never finished.
 */
const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/explore", label: "Explore" },
  { href: "/think", label: "Think" },
  { href: "/studio", label: "Studio" },
  { href: "/ledger", label: "Track record" },
  { href: "/voice", label: "You" },
];

const MOBILE_LINKS = [...LINKS, { href: "/gallery", label: "Library" }, { href: "/guide", label: "How it works" }];

const base = "rounded-md px-3 py-1.5 text-sm transition";
const activeCls = "bg-surface text-fg";
const idleCls = "text-muted hover:bg-surface hover:text-fg";

export function Nav() {
  const pathname = usePathname() ?? "/";
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark className="h-[22px] w-[22px]" />
          <span>Crux</span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`${base} ${isActive(l.href) ? activeCls : idleCls}`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/guide"
            title="How it works"
            aria-label="How it works"
            aria-current={isActive("/guide") ? "page" : undefined}
            className={`${base} ${isActive("/guide") ? activeCls : idleCls}`}
          >
            <HelpCircle className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("ce:command-open"))}
            aria-label="Open command menu"
            title="Command menu (Ctrl/⌘ K)"
            className={`${base} ${idleCls} hidden items-center gap-1.5 lg:flex`}
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="font-mono text-[10px] tracking-wide text-muted">⌘K</kbd>
          </button>
          <SettingsButton />
          <AuthButton />
        </nav>

        {/* Mobile cluster */}
        <div className="flex items-center gap-1 md:hidden">
          <SettingsButton />
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            className="rounded-md border border-line px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <nav aria-label="Main" className="border-t border-line bg-ink px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {MOBILE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded-md px-3 py-2.5 text-sm ${isActive(l.href) ? activeCls : idleCls}`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-line pt-2">
              <AuthButton />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
