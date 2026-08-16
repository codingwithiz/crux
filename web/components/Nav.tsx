"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, HelpCircle, Search } from "lucide-react";
import { SettingsButton } from "./SettingsButton";
import { AuthButton } from "./AuthButton";
import { LogoMark } from "./Logo";

/**
 * DESIGN.md §9 — five primary destinations, in the order of the Crux loop:
 * Discover → Think → Commit → Express.
 *
 * The previous nav carried seven links in three groups, all at identical
 * weight, with Library and Voice sitting in the primary row and Studio
 * (Express) preceding the Ledger (Commit) — so the row described a menu rather
 * than a sequence. Library and Voice are secondary destinations per §9 and now
 * live in the utility cluster on the right.
 *
 * Still flat links, not dropdowns: the old Create▾/Library▾ menus were retired
 * because their keyboard behaviour was never finished.
 */
const PRIMARY: { href: string; label: string }[] = [
  { href: "/today", label: "Today" },
  { href: "/explore", label: "Explore" },
  { href: "/think", label: "Think" },
  { href: "/ledger", label: "Ledger" },
  { href: "/studio", label: "Studio" },
];

/** §9 secondary destinations. Quieter than the loop, still one click away. */
const SECONDARY: { href: string; label: string }[] = [
  { href: "/gallery", label: "Library" },
  { href: "/voice", label: "Voice" },
];

/** §9: "Think is the primary action" — visually more prominent than ordinary
 *  navigation, "but it should not become a giant pill button." So: no fill, no
 *  border, no accent background. It reads brighter than its siblings and takes
 *  a thin amber rule, which marks it as the verb without turning it into a CTA. */
const PRIMARY_ACTION = "/think";

const MOBILE_LINKS = [
  ...PRIMARY,
  ...SECONDARY,
  { href: "/guide", label: "How it works" },
];

const base = "rounded-control px-3 py-1.5 text-small transition duration-(--dur-fast) ease-out";
/** Three distinguishable states. Hover used to apply the same `bg-surface
 *  text-fg` as active, so a hovered idle link was indistinguishable from the
 *  page you were on. Only the current page gets a fill. */
const activeCls = "bg-surface text-fg";
const idleCls = "text-muted hover:text-fg";

export function Nav() {
  const pathname = usePathname() ?? "/";
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close on route change — tapping a link already calls setMobileOpen(false),
  // but a ⌘K jump or a browser back button would otherwise leave it open.
  // Adjusted during render rather than in an effect: an effect would paint the
  // new page with the panel still over it for a frame.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  /**
   * §19: keyboard-accessible, dismissible, and it must not leave the page
   * scrolling underneath. The panel previously had none of these — it closed
   * only by tapping a link, so a keyboard user who opened it was stuck.
   */
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobileOpen(false);
      toggleRef.current?.focus();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark className="h-[22px] w-[22px]" />
          <span>Crux</span>
        </Link>

        {/* The loop. Visible from md — the desktop nav used to start at lg, so
            the whole tablet range got the hamburger and no navigation at all. */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {PRIMARY.map((l) => {
            const active = isActive(l.href);
            const lead = l.href === PRIMARY_ACTION;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`${base} ${
                  active ? activeCls : lead ? "text-fg font-medium" : idleCls
                } ${lead ? "relative" : ""}`}
              >
                {l.label}
                {lead && !active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-px h-px bg-accent"
                  />
                )}
              </Link>
            );
          })}

          {/* Secondary destinations (§9). Held back to lg so the loop keeps the
              room it needs on a tablet. */}
          <span aria-hidden className="mx-1 hidden h-4 w-px bg-line lg:block" />
          {SECONDARY.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`${base} ${isActive(l.href) ? activeCls : idleCls} hidden lg:block`}
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
            className={`${base} ${idleCls} hidden items-center gap-1.5 xl:flex`}
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="font-mono text-micro tracking-wide text-muted">⌘K</kbd>
          </button>
          <SettingsButton />
          <AuthButton />
        </nav>

        {/* Mobile cluster */}
        <div className="flex items-center gap-1 md:hidden">
          <SettingsButton />
          <button
            ref={toggleRef}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            className="rounded-control border border-line px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile panel. §20: navigation becomes compact — but the loop keeps its
          shape, so the five primary destinations stay together above a rule and
          the secondary ones sit below it. The flat eight-item list this replaced
          discarded the grouping entirely. */}
      {mobileOpen && (
        <nav
          ref={panelRef}
          aria-label="Main"
          className="ce-fade-up border-t border-line bg-ink px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {PRIMARY.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded-control px-3 py-2.5 text-small ${
                  isActive(l.href)
                    ? activeCls
                    : l.href === PRIMARY_ACTION
                      ? "text-fg font-medium"
                      : idleCls
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
              {MOBILE_LINKS.slice(PRIMARY.length).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`rounded-control px-3 py-2.5 text-small ${isActive(l.href) ? activeCls : idleCls}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            {/* empty:hidden — AuthButton renders nothing in single-user mode,
                which otherwise left a rule with padding under it and no row. */}
            <div className="mt-2 border-t border-line pt-2 empty:hidden">
              <AuthButton />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
