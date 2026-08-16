"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { Images, Send } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { SlideCanvas } from "@/components/carousel/SlideCanvas";
import { getDesign } from "@/lib/carousel/design";
import { slideDims } from "@/lib/carousel/size";
import { applyBrand } from "@/lib/carousel/brand";
import { slideToBlob, downloadBlob } from "@/lib/carousel/export";
import { buildCaption } from "@/lib/carousel/caption";
import { listCarousels, removeCarousel } from "@/lib/carousels";
import { manualPublisher, PLATFORMS, type Platform } from "@/lib/publish";
import type { Carousel } from "@/lib/types";

export function GalleryView() {
  const [items, setItems] = useState<Carousel[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [exporting, setExporting] = useState<Carousel | null>(null);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  function load() {
    listCarousels()
      .then((cs) => { setItems(cs); setErr(null); })
      .catch((e) => { setItems([]); setErr((e as Error).message); });
  }

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  /**
   * Two-step delete, the same rule the track record uses. A saved deck is real
   * work — slides you edited, a style you chose — and this used to destroy it on
   * one click with no undo, from a button sitting beside "Open".
   */
  async function del(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setConfirmDelete(null);
    await removeCarousel(id);
    load();
  }

  function publish(c: Carousel, platform: Platform) {
    // The real caption builder, not the deck title — the Queue used to hand the
    // composer a bare title while the Studio copied a full caption.
    const r = manualPublisher.publish({ platform, caption: buildCaption(c.slides, c.handle) });
    if (r.ok) toast.success(r.message);
    else toast.error(r.message);
  }

  async function downloadZip(c: Carousel) {
    setBusy(true);
    try {
      const zip = new JSZip();
      const useStored = c.imageUrls && c.imageUrls.length === c.slides.length;
      if (useStored) {
        for (let i = 0; i < c.slides.length; i++) {
          const res = await fetch(c.imageUrls![i]);
          if (!res.ok) throw new Error("fetch failed");
          zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, await res.blob());
        }
      } else {
        // Client-render this carousel off-screen, then snapshot each slide.
        exportRefs.current = [];
        setExporting(c);
        await new Promise((r) => setTimeout(r, 450));
        await Promise.all([...document.images].map((im) => (im.complete ? null : new Promise((r) => { im.onload = im.onerror = r; }))));
        for (let i = 0; i < c.slides.length; i++) {
          const node = exportRefs.current[i];
          if (node) zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, await slideToBlob(node));
        }
        setExporting(null);
      }
      downloadBlob(await zip.generateAsync({ type: "blob" }), (c.title || "carousel") + ".zip");
    } catch (e) {
      setExporting(null);
      toast.error("Export failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!items)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  if (err)
    return (
      <div className="rounded-surface border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
        Couldn&rsquo;t load your carousels. Anything saved on this device is still safe — try
        reloading, or sign in again if the problem sticks.
      </div>
    );
  if (!items.length)
    return (
      <EmptyState
        icon={Images}
        title="No carousels yet"
        description="Turn a take you've saved into a studio-grade carousel — saved decks land here, ready to re-open and export."
        cta={{ href: "/studio", label: "Open the Studio" }}
      />
    );

  const s = 0.16;
  const dimsOf = (c: Carousel) => slideDims(c.slides[0]?.size);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Off-screen render used when a carousel has no stored PNGs. */}
      {exporting && (
        <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}>
          {exporting.slides.map((sl, i) => (
            <SlideCanvas
              key={i}
              slide={sl}
              design={applyBrand(getDesign(exporting.designId), sl.brand)}
              index={i}
              total={exporting.slides.length}
              handle={exporting.handle}
              size={sl.size}
              innerRef={(el) => { exportRefs.current[i] = el; }}
            />
          ))}
        </div>
      )}

      {items.map((c) => {
        const first = c.slides[0];
        return (
          <div key={c.id} className="rounded-surface border border-line bg-surface/40 p-3">
            <div className="flex gap-3">
              <div className="shrink-0 overflow-hidden rounded-control ring-1 ring-line" style={{ width: dimsOf(c).w * s, height: dimsOf(c).h * s }}>
                {c.imageUrls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrls[0]} alt={c.title || "carousel"} width={dimsOf(c).w * s} height={dimsOf(c).h * s} />
                ) : first ? (
                  <div style={{ width: dimsOf(c).w, height: dimsOf(c).h, transform: `scale(${s})`, transformOrigin: "top left" }}>
                    <SlideCanvas slide={first} design={applyBrand(getDesign(c.designId), first.brand)} index={0} total={c.slides.length || 1} handle={c.handle} size={first.size} />
                  </div>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium">{c.title || "Untitled"}</p>
                <p className="mt-1 text-xs text-muted">
                  {c.slides.length} slides · {new Date(c.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <Link href={`/studio?c=${c.id}`} className="rounded-control bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:brightness-110">Open</Link>
                  <button onClick={() => downloadZip(c)} disabled={busy} className="rounded-control border border-line px-3 py-1.5 text-xs hover:bg-surface disabled:opacity-50">.zip</button>
                  <button
                    onClick={() => void del(c.id)}
                    onBlur={() => confirmDelete === c.id && setConfirmDelete(null)}
                    className={`rounded-control border px-3 py-1.5 text-xs transition ${
                      confirmDelete === c.id
                        ? "border-danger/60 text-danger"
                        : "border-line text-muted hover:text-danger"
                    }`}
                  >
                    {confirmDelete === c.id ? "Click again to delete" : "Delete"}
                  </button>
                </div>
                {/* Opens the platform's composer with the caption ready. Moved
                    here from the Queue, whose scheduling stored a date nothing
                    ever read. */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
                  <span className="inline-flex items-center gap-1 text-micro text-muted">
                    <Send className="h-3 w-3" /> Post to
                  </span>
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => publish(c, p.id)}
                      className="rounded-full border border-line px-2.5 py-0.5 text-micro text-muted transition hover:bg-surface hover:text-fg"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
