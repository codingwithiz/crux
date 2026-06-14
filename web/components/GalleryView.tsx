"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { SlideArt } from "@/lib/slide-render";
import { getTheme, slideSrc } from "@/lib/slides";
import { listCarousels, removeCarousel } from "@/lib/carousels";
import type { Carousel } from "@/lib/types";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function GalleryView() {
  const [items, setItems] = useState<Carousel[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listCarousels().then(setItems);
  }, []);

  async function del(id: string) {
    await removeCarousel(id);
    setItems(await listCarousels());
  }

  async function downloadZip(c: Carousel) {
    setBusy(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < c.slides.length; i++) {
        const res = await fetch(
          slideSrc({ slide: c.slides[i], themeId: c.themeId, index: i, total: c.slides.length, handle: c.handle }),
        );
        if (!res.ok) throw new Error("render failed");
        zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, await res.blob());
      }
      download(await zip.generateAsync({ type: "blob" }), (c.title || "carousel") + ".zip");
    } catch (e) {
      alert("Export failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!items) return <p className="text-muted">Loading…</p>;
  if (!items.length)
    return (
      <div className="rounded-xl border border-dashed border-line p-8 text-center text-muted">
        No saved carousels yet. Make one in the{" "}
        <Link href="/studio" className="text-accent underline-offset-4 hover:underline">
          Studio
        </Link>{" "}
        and hit Save.
      </div>
    );

  const s = 0.16;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((c) => (
        <div key={c.id} className="rounded-xl border border-line bg-surface/40 p-3">
          <div className="flex gap-3">
            <div
              className="shrink-0 overflow-hidden rounded-md ring-1 ring-line"
              style={{ width: 1080 * s, height: 1350 * s }}
            >
              <div style={{ width: 1080, height: 1350, transform: `scale(${s})`, transformOrigin: "top left" }}>
                <SlideArt
                  slide={c.slides[0] ?? { kind: "hook", kicker: "", title: c.title, body: "" }}
                  theme={getTheme(c.themeId)}
                  index={0}
                  total={c.slides.length || 1}
                  handle={c.handle}
                />
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-sm font-medium">{c.title || "Untitled"}</p>
              <p className="mt-1 text-xs text-muted">
                {c.slides.length} slides · {new Date(c.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <Link
                  href={`/studio?c=${c.id}`}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:brightness-110"
                >
                  Open
                </Link>
                <button
                  onClick={() => downloadZip(c)}
                  disabled={busy}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface disabled:opacity-50"
                >
                  .zip
                </button>
                <button
                  onClick={() => del(c.id)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-fg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
