"use client";

import { useEffect, useState } from "react";
import { AtSign } from "lucide-react";
import { toast } from "sonner";
import { getBrandKit, saveBrandKit, normalizeHandle } from "@/lib/brand-kit";

/** Set the handle/identity stamped on every carousel. Saved per-device. */
export function BrandKitEditor() {
  const [handle, setHandle] = useState("@you");
  const [name, setName] = useState("");

  // Seeded after mount on purpose: the brand kit lives in localStorage, which
  // the server can't read. Initialising from it during render would make the
  // server and client first paints disagree — a hydration error, not a nicety.
  /* eslint-disable react-hooks/set-state-in-effect -- see note above */
  useEffect(() => {
    const b = getBrandKit();
    setHandle(b.handle);
    setName(b.name ?? "");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function save() {
    const next = { handle: normalizeHandle(handle), name: name.trim() || undefined };
    saveBrandKit(next);
    setHandle(next.handle);
    toast.success("Brand kit saved");
  }

  return (
    <div className="rounded-surface border border-line bg-surface/40 p-5">
      <div className="flex items-center gap-2">
        <AtSign className="h-4 w-4 text-accent" />
        <h2 className="text-body font-semibold">Brand kit</h2>
      </div>
      <p className="mt-1 text-small text-muted">
        Your handle is stamped on every carousel footer. Set it once and it applies everywhere.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-micro font-medium uppercase tracking-wide text-muted">Handle</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@yourname"
            className="mt-1 w-full rounded-control border border-line bg-ink px-3 py-2 text-small outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-micro font-medium uppercase tracking-wide text-muted">Display name (optional)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            className="mt-1 w-full rounded-control border border-line bg-ink px-3 py-2 text-small outline-none focus:border-accent"
          />
        </label>
      </div>
      <button
        onClick={save}
        className="ce-press mt-4 rounded-control bg-accent px-4 py-2 text-small font-medium text-accent-fg hover:brightness-110"
      >
        Save brand kit
      </button>
    </div>
  );
}
