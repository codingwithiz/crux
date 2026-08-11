"use client";

import { Command } from "cmdk";
import { useEffect, useState, type ComponentType } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  Newspaper,
  PenLine,
  Images,
  BookMarked,
  Home,
  Mic,
  HelpCircle,
} from "lucide-react";

/** Global Cmd/Ctrl+K command palette — keyboard-first navigation + actions. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // The standard "we are past hydration" flag: the palette portals into
  // document.body, which only exists on the client.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Only the open/close shortcut lives here. Escape is handled by Dialog
    // while it is open — this listener used to swallow Escape app-wide even
    // when the palette was closed.
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("ce:command-open", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("ce:command-open", onOpen);
    };
  }, []);

  if (!mounted) return null;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title="Command menu"
      align="top"
      z={120}
      className="max-w-lg overflow-hidden"
    >
      <Command label="Command menu">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <Command.Input
            autoFocus
            placeholder="Search commands…"
            className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-muted"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
            No matching commands.
          </Command.Empty>
          {/* Labels mirror the nav exactly. cmdk matches on the visible text,
              so a label that drifts from the nav is a destination the user can
              see but cannot search for. */}
          <Command.Group heading="Go to">
            <Item icon={Home} onSelect={() => go("/today")}>
              Today
            </Item>
            <Item icon={Newspaper} onSelect={() => go("/explore")}>
              Explore
            </Item>
            <Item icon={Sparkles} onSelect={() => go("/think")}>
              Think
            </Item>
            <Item icon={PenLine} onSelect={() => go("/studio")}>
              Studio
            </Item>
            <Item icon={BookMarked} onSelect={() => go("/ledger")}>
              Track record
            </Item>
            <Item icon={Images} onSelect={() => go("/gallery")}>
              Library
            </Item>
            <Item icon={Mic} onSelect={() => go("/voice")}>
              You
            </Item>
            <Item icon={HelpCircle} onSelect={() => go("/guide")}>
              How it works
            </Item>
          </Command.Group>
        </Command.List>
      </Command>
    </Dialog>
  );
}

function Item({
  icon: Icon,
  children,
  onSelect,
}: {
  icon: ComponentType<{ className?: string }>;
  children: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={children}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg data-[selected=true]:bg-ink"
    >
      <Icon className="h-4 w-4 text-muted" />
      {children}
    </Command.Item>
  );
}
