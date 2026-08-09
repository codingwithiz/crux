"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * The app's one modal.
 *
 * There were three hand-rolled copies of this markup and none of them could be
 * closed with a keyboard, announced itself as a dialog, kept focus inside, or
 * gave focus back to whatever opened it — so a keyboard or screen-reader user
 * could open one and be stranded behind it. Consolidating fixes all three at
 * once and means the next dialog inherits the behaviour instead of repeating
 * the omission.
 *
 * Styling stays deliberately thin: `globals.css` already supplies the focus
 * ring, reduced-motion handling, and `ce-fade-up`.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  align = "center",
  z = 100,
  className = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  /** Announced as the dialog's name. */
  title: string;
  children: ReactNode;
  align?: "center" | "top";
  z?: number;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    // Hand focus back to whatever opened this, so closing doesn't dump the
    // caret at the top of the page.
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    focusables()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // Wrap at both ends, and pull focus back in if it has escaped the panel.
      if (e.shiftKey && (active === first || !panel.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    // Only while open — a listener that outlives the dialog swallows Escape
    // for whatever is underneath it.
    document.addEventListener("keydown", onKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{ zIndex: z }}
      className={`fixed inset-0 flex justify-center overflow-y-auto bg-black/60 p-4 ${
        align === "top" ? "items-start pt-[10vh]" : "items-center"
      }`}
      onClick={onClose}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={`ce-fade-up my-auto flex max-h-[88dvh] w-full flex-col rounded-xl border border-line bg-surface shadow-2xl ${className}`}
      >
        {/* Present for assistive tech even when the design shows its own header. */}
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
