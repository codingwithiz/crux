"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { Images } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { SlideCanvas } from "@/components/carousel/SlideCanvas";
import { getDesign } from "@/lib/carousel/design";
import { applyBrand } from "@/lib/carousel/brand";
import { slideToBlob, downloadBlob } from "@/lib/carousel/export";
import { listCarousels, removeCarousel } from "@/lib/carousels";
import type { Carousel } from "@/lib/types";

export function GalleryView() {
  const [items, setItems] = useState<Carousel[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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

  async function del(id: string) {
    await removeCarousel(id);
    load();
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
      alert("Export failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!items)
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  if (err)
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        {err} — if you&rsquo;re signed in, make sure migration{" "}
        <code className="font-mono">0002_carousels.sql</code> (and{" "}
        <code className="font-mono">0005_carousel_storage.sql</code>) have been run.
      </div>
    );
  if (!items.length)
    return (
      <EmptyState
        icon={Images}
        title="No carousels yet"
        description="Turn a committed opinion into a studio-grade carousel — saved decks land here, ready to re-open and export."
        cta={{ href: "/studio", label: "Open the Studio" }}
      />
    );

  const s = 0.16;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
              innerRef={(el) => { exportRefs.current[i] = el; }}
            />
          ))}
        </div>
      )}

      {items.map((c) => {
        const first = c.slides[0];
        return (
          <div key={c.id} className="rounded-xl border border-line bg-surface/40 p-3">
            <div className="flex gap-3">
              <div className="shrink-0 overflow-hidden rounded-md ring-1 ring-line" style={{ width: 1080 * s, height: 1350 * s }}>
                {c.imageUrls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrls[0]} alt={c.title || "carousel"} width={1080 * s} height={1350 * s} />
                ) : first ? (
                  <div style={{ width: 1080, height: 1350, transform: `scale(${s})`, transformOrigin: "top left" }}>
                    <SlideCanvas slide={first} design={applyBrand(getDesign(c.designId), first.brand)} index={0} total={c.slides.length || 1} handle={c.handle} />
                  </div>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium">{c.title || "Untitled"}</p>
                <p className="mt-1 text-xs text-muted">
                  {c.slides.length} slides · {new Date(c.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <Link href={`/studio?c=${c.id}`} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:brightness-110">Open</Link>
                  <button onClick={() => downloadZip(c)} disabled={busy} className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface disabled:opacity-50">.zip</button>
                  <button onClick={() => del(c.id)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-fg">Delete</button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
