"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SettingsButton } from "./SettingsButton";
import { AuthButton } from "./AuthButton";

const CREATE = [
  { href: "/news", label: "From the news" },
  { href: "/think", label: "From a thought" },
];
const LIBRARY = [
  { href: "/ledger", label: "Ledger" },
  { href: "/gallery", label: "Carousels" },
  { href: "/studio", label: "Studio" },
];
// Flattened list for the mobile menu.
const ALL_LINKS = [
  { href: "/today", label: "Today" },
  ...CREATE,
  ...LIBRARY,
  { href: "/voice", label: "Voice" },
  { href: "/guide", label: "How it works" },
];

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
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />
          Conviction<span className="text-muted">Engine</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <Link href="/today" className={`${base} ${isActive("/today") ? activeCls : idleCls}`}>Today</Link>
          <NavGroup label="Create" items={CREATE} isActive={isActive} />
          <NavGroup label="Library" items={LIBRARY} isActive={isActive} />
          <Link href="/voice" className={`${base} ${isActive("/voice") ? activeCls : idleCls}`}>Voice</Link>
          <Link href="/guide" title="How it works" className={`${base} ${isActive("/guide") ? activeCls : idleCls}`}>?</Link>
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
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="border-t border-line bg-ink px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {ALL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2.5 text-sm ${isActive(l.href) ? activeCls : idleCls}`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-line pt-2">
              <AuthButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function NavGroup({
  label,
  items,
  isActive,
}: {
  label: string;
  items: { href: string; label: string }[];
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groupActive = items.some((i) => isActive(i.href));

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`${base} ${groupActive ? activeCls : idleCls}`}>
        {label} <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[180px] rounded-lg border border-line bg-surface p-1 shadow-2xl">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm ${isActive(i.href) ? "bg-ink text-fg" : "text-muted hover:bg-ink hover:text-fg"}`}
            >
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
