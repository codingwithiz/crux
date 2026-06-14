"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { nanoid } from "nanoid";
import { SlideArt } from "@/lib/slide-render";
import { THEMES, getTheme, slideSrc } from "@/lib/slides";
import { loadDraft } from "@/lib/draft";
import { saveCarousel, getCarousel, uploadCarouselImages } from "@/lib/carousels";
import { getSettings } from "@/lib/settings";
import { getVoice, effectiveVoice } from "@/lib/voice";
import type { Carousel, Slide } from "@/lib/types";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function CarouselStudio({
  initialSlides,
  initialHandle = "@you",
  loadId,
}: {
  initialSlides: Slide[];
  initialHandle?: string;
  loadId?: string;
}) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [handle, setHandle] = useState(initialHandle);
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [carouselId, setCarouselId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const loaded = useRef(false);

  // Auto-generated carousel: the actual exported PNGs (HTML → Satori → image),
  // rendered on arrival so the finished artifact is the first thing you see.
  const [rendered, setRendered] = useState<string[]>([]);
  const [rendering, setRendering] = useState(false);
  const [renderErr, setRenderErr] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const renderedBlobs = useRef<Blob[]>([]);

  // Re-voice: rewrite the current slides in the user's saved voice.
  const [revoicing, setRevoicing] = useState(false);
  const [revoiceMsg, setRevoiceMsg] = useState<string | null>(null);

  /** Render every slide to a PNG via /api/slide and hold the blobs + object URLs. */
  async function renderAll(s: Slide[] = slides, tId: string = themeId, h: string = handle) {
    setRendering(true);
    setRenderErr(null);
    try {
      const urls: string[] = [];
      const blobs: Blob[] = [];
      for (let i = 0; i < s.length; i++) {
        const res = await fetch(slideSrc({ slide: s[i], themeId: tId, index: i, total: s.length, handle: h }));
        if (!res.ok) throw new Error(`slide ${i + 1} failed to render`);
        const blob = await res.blob();
        blobs.push(blob);
        urls.push(URL.createObjectURL(blob));
      }
      // Swap in the fresh set, then revoke the previous URLs.
      setRendered((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return urls;
      });
      renderedBlobs.current = blobs;
      setStale(false);
    } catch (e) {
      setRenderErr((e as Error).message);
    } finally {
      setRendering(false);
    }
  }

  // On first mount: load the draft handed over from the conviction flow (or a
  // saved carousel), then auto-generate the images for it.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void (async () => {
      let s = initialSlides;
      let tId = THEMES[0].id;
      let h = initialHandle;
      if (loadId) {
        const c = await getCarousel(loadId);
        if (c) {
          setSlides(c.slides);
          setThemeId(c.themeId);
          setHandle(c.handle);
          setTitle(c.title);
          setCarouselId(c.id);
          setCreatedAt(c.createdAt);
          s = c.slides;
          tId = c.themeId;
          h = c.handle;
        }
      } else {
        const d = loadDraft();
        if (d?.slides?.length) {
          setSlides(d.slides);
          setHandle(d.handle || initialHandle);
          s = d.slides;
          h = d.handle || initialHandle;
        }
      }
      void renderAll(s, tId, h);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHandle, loadId]);

  // Revoke any outstanding object URLs when the studio unmounts.
  useEffect(() => {
    return () => {
      renderedBlobs.current = [];
      rendered.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const theme = getTheme(themeId);
  const total = slides.length;
  const idx = Math.min(sel, total - 1);
  const current = slides[idx];

  // Any edit invalidates the generated images until regenerated.
  function patch(p: Partial<Slide>) {
    setSlides((s) => s.map((sl, i) => (i === idx ? { ...sl, ...p } : sl)));
    setStale(true);
  }
  function add() {
    setSlides((s) => [...s, { kind: "argument", kicker: "POINT", title: "", body: "New point" }]);
    setSel(total);
    setStale(true);
  }
  function remove(i: number) {
    if (total <= 1) return;
    setSlides((s) => s.filter((_, k) => k !== i));
    setSel(Math.max(0, i - 1));
    setStale(true);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= total) return;
    setSlides((s) => {
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    setSel(j);
    setStale(true);
  }
  function pickTheme(id: string) {
    setThemeId(id);
    setStale(true);
  }
  function setHandleStale(v: string) {
    setHandle(v);
    setStale(true);
  }

  async function downloadAll() {
    setBusy(true);
    try {
      // Reuse the freshly-generated images when they're still valid.
      if (stale || renderedBlobs.current.length !== slides.length) await renderAll();
      const blobs = renderedBlobs.current;
      if (blobs.length !== slides.length) throw new Error("nothing rendered");
      const zip = new JSZip();
      blobs.forEach((b, i) => zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, b));
      download(await zip.generateAsync({ type: "blob" }), "carousel.zip");
    } catch (e) {
      alert("Render failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function downloadOne(i: number) {
    setBusy(true);
    try {
      const fresh = !stale && renderedBlobs.current[i];
      const blob = fresh
        ? renderedBlobs.current[i]
        : await (async () => {
            const res = await fetch(slideSrc({ slide: slides[i], themeId, index: i, total, handle }));
            if (!res.ok) throw new Error("render failed");
            return res.blob();
          })();
      download(blob, `slide-${String(i + 1).padStart(2, "0")}.png`);
    } catch (e) {
      alert("Render failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revoice() {
    setRevoicing(true);
    setRevoiceMsg(null);
    try {
      const voice = effectiveVoice(await getVoice());
      const res = await fetch("/api/revoice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slides, settings: getSettings(), voice }),
      });
      const j = (await res.json()) as { slides?: Slide[]; error?: string };
      if (!res.ok || !j.slides?.length) {
        throw new Error(
          j.error === "no_model"
            ? "No model key — add one in the Model menu (top-right)."
            : j.error || "Re-voice failed",
        );
      }
      setSlides(j.slides);
      setRevoiceMsg("Rewritten in your voice — regenerating images…");
      await renderAll(j.slides, themeId, handle);
      setRevoiceMsg("Done — now in your voice.");
    } catch (e) {
      setRevoiceMsg((e as Error).message);
    } finally {
      setRevoicing(false);
    }
  }

  async function save() {
    setBusy(true);
    setSaveMsg(null);
    try {
      const id = carouselId ?? nanoid();
      // Make sure we have the current PNGs, then persist them to Storage so the
      // saved carousel keeps real images (signed-in users). Falls back silently.
      if (stale || renderedBlobs.current.length !== slides.length) await renderAll();
      let imageUrls: string[] | undefined;
      try {
        const urls = await uploadCarouselImages(id, renderedBlobs.current);
        if (urls.length) imageUrls = urls;
      } catch {
        /* not signed in / storage off — keep editable data only */
      }
      const c: Carousel = {
        id,
        title: title.trim() || slides[0]?.title?.slice(0, 60) || "Untitled",
        slides,
        themeId,
        handle,
        createdAt: createdAt ?? new Date().toISOString(),
        imageUrls,
      };
      await saveCarousel(c);
      setCarouselId(id);
      setCreatedAt(c.createdAt);
      setSaveMsg(imageUrls ? "Saved + images uploaded" : "Saved");
    } catch (e) {
      setSaveMsg("Save failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const big = 0.42;
  const thumb = 0.12;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Carousel title"
            className="flex-1 rounded-lg border border-line bg-surface/40 px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50"
          >
            {busy ? "…" : carouselId ? "Update" : "Save"}
          </button>
          {saveMsg && <span className="whitespace-nowrap text-xs text-muted">{saveMsg}</span>}
        </div>

        {/* Auto-generated carousel: the finished, exportable PNGs. */}
        <div className="rounded-2xl border border-line bg-surface/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Generated carousel</p>
              <p className="text-xs text-muted">
                {rendering
                  ? "Rendering slides to images…"
                  : renderErr
                    ? "Couldn't render — try regenerate."
                    : stale
                      ? "Edited since last render — regenerate to refresh."
                      : `${rendered.length} slide${rendered.length === 1 ? "" : "s"} · 1080×1350 PNG · ready to post`}
              </p>
            </div>
            <div className="flex gap-2">
              {(stale || renderErr) && !rendering && (
                <button
                  onClick={() => void renderAll()}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface"
                >
                  Regenerate
                </button>
              )}
              <button
                onClick={downloadAll}
                disabled={busy || rendering || (rendered.length === 0 && !stale)}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Preparing…" : "Download all (.zip)"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {rendering && rendered.length === 0 ? (
              Array.from({ length: total }).map((_, i) => (
                <div
                  key={i}
                  className="shrink-0 animate-pulse rounded-md bg-line/40"
                  style={{ width: 1080 * thumb, height: 1350 * thumb }}
                />
              ))
            ) : rendered.length > 0 ? (
              rendered.map((url, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSel(i);
                    void downloadOne(i);
                  }}
                  title={`Download slide ${i + 1}`}
                  className={`group relative shrink-0 overflow-hidden rounded-md ring-1 ring-line ${stale ? "opacity-60" : ""}`}
                  style={{ width: 1080 * thumb, height: 1350 * thumb }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Slide ${i + 1}`} width={1080 * thumb} height={1350 * thumb} />
                  <span className="absolute inset-x-0 bottom-0 hidden bg-black/60 py-0.5 text-center text-[10px] text-white group-hover:block">
                    ↓ PNG
                  </span>
                </button>
              ))
            ) : (
              <p className="py-6 text-sm text-muted">No images yet.</p>
            )}
          </div>
        </div>

        {/* Fine-tune: live editable preview + themes. */}
        <p className="mt-6 text-sm font-semibold">Fine-tune</p>
        <p className="text-xs text-muted">Edit copy, pick a theme, then regenerate above.</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => void revoice()}
            disabled={revoicing || rendering}
            className="rounded-lg bg-cool/15 px-3 py-1.5 text-sm font-medium text-cool ring-1 ring-cool/40 transition hover:bg-cool/25 disabled:opacity-50"
            title="Rewrite the current slide copy in your saved voice"
          >
            {revoicing ? "Rewriting…" : "✶ Rewrite in my voice"}
          </button>
          <a
            href="/voice"
            className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            edit my voice →
          </a>
          {revoiceMsg && <span className="text-xs text-cool">{revoiceMsg}</span>}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => pickTheme(t.id)}
                title={t.name}
                className={`h-7 w-7 rounded-full border-2 ${themeId === t.id ? "border-fg" : "border-line"}`}
                style={{ background: t.bg }}
              >
                <span
                  className="block h-full w-full rounded-full"
                  style={{ boxShadow: `inset 0 0 0 3px ${t.accent}` }}
                />
              </button>
            ))}
          </div>
          <button
            onClick={() => downloadOne(idx)}
            disabled={busy}
            className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50"
          >
            This slide PNG
          </button>
        </div>

        <div className="mt-4 flex justify-center rounded-2xl border border-line bg-surface/40 p-6">
          <div
            className="shadow-2xl"
            style={{ width: 1080 * big, height: 1350 * big, overflow: "hidden", borderRadius: 14 }}
          >
            <div style={{ width: 1080, height: 1350, transform: `scale(${big})`, transformOrigin: "top left" }}>
              <SlideArt slide={current} theme={theme} index={idx} total={total} handle={handle} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {slides.map((sl, i) => (
            <button
              key={i}
              onClick={() => setSel(i)}
              className={`shrink-0 overflow-hidden rounded-md ${i === idx ? "ring-2 ring-accent" : "ring-1 ring-line"}`}
              style={{ width: 1080 * thumb, height: 1350 * thumb }}
            >
              <div style={{ width: 1080, height: 1350, transform: `scale(${thumb})`, transformOrigin: "top left" }}>
                <SlideArt slide={sl} theme={theme} index={i} total={total} handle={handle} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-surface/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Slide {idx + 1} / {total}
          </h2>
          <div className="flex gap-1">
            <button onClick={() => move(idx, -1)} className="rounded px-2 py-1 text-xs text-muted hover:bg-surface" title="Move left">
              ←
            </button>
            <button onClick={() => move(idx, 1)} className="rounded px-2 py-1 text-xs text-muted hover:bg-surface" title="Move right">
              →
            </button>
            <button onClick={() => remove(idx)} className="rounded px-2 py-1 text-xs text-red-400 hover:bg-surface" title="Delete">
              ✕
            </button>
          </div>
        </div>

        <label className="mt-4 block text-xs font-medium text-muted">Kicker</label>
        <input
          value={current.kicker}
          onChange={(e) => patch({ kicker: e.target.value })}
          className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm"
        />

        <label className="mt-3 block text-xs font-medium text-muted">Title</label>
        <textarea
          value={current.title}
          onChange={(e) => patch({ title: e.target.value })}
          rows={3}
          className="mt-1 w-full resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm"
        />

        <label className="mt-3 block text-xs font-medium text-muted">Body</label>
        <textarea
          value={current.body}
          onChange={(e) => patch({ body: e.target.value })}
          rows={5}
          className="mt-1 w-full resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm"
        />

        <button
          onClick={add}
          className="mt-4 w-full rounded-lg border border-dashed border-line py-2 text-sm text-muted hover:bg-surface hover:text-fg"
        >
          + Add slide
        </button>

        <label className="mt-5 block text-xs font-medium text-muted">Handle</label>
        <input
          value={handle}
          onChange={(e) => setHandleStale(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm"
        />
      </aside>
    </div>
  );
}
