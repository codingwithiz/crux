"use client";

import { Command } from "cmdk";
import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  Newspaper,
  PenLine,
  Images,
  BookMarked,
  CalendarClock,
  Home,
  Mic,
  HelpCircle,
} from "lucide-react";

/** Global Cmd/Ctrl+K command palette — keyboard-first navigation + actions. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
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

  if (!mounted || !open) return null;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <Command
        label="Command menu"
        className="ce-fade-up w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
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
          <Command.Group heading="Create">
            <Item icon={Sparkles} onSelect={() => go("/think")}>
              New opinion — from a thought
            </Item>
            <Item icon={Newspaper} onSelect={() => go("/news")}>
              From the news
            </Item>
          </Command.Group>
          <Command.Group heading="Library">
            <Item icon={PenLine} onSelect={() => go("/studio")}>
              Carousel Studio
            </Item>
            <Item icon={Images} onSelect={() => go("/gallery")}>
              Carousels
            </Item>
            <Item icon={BookMarked} onSelect={() => go("/ledger")}>
              Thesis Ledger
            </Item>
            <Item icon={CalendarClock} onSelect={() => go("/queue")}>
              Queue
            </Item>
          </Command.Group>
          <Command.Group heading="Go to">
            <Item icon={Home} onSelect={() => go("/today")}>
              Today
            </Item>
            <Item icon={Mic} onSelect={() => go("/voice")}>
              Voice
            </Item>
            <Item icon={HelpCircle} onSelect={() => go("/guide")}>
              How it works
            </Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>,
    document.body,
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
