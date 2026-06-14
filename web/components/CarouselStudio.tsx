"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { nanoid } from "nanoid";
import { SlideArt } from "@/lib/slide-render";
import { THEMES, getTheme, slideSrc } from "@/lib/slides";
import { loadDraft } from "@/lib/draft";
import { saveCarousel, getCarousel } from "@/lib/carousels";
import type { Carousel, Slide, SlideKind } from "@/lib/types";

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

  // On first mount, prefer a draft handed over from the conviction flow.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void (async () => {
      if (loadId) {
        const c = await getCarousel(loadId);
        if (c) {
          setSlides(c.slides);
          setThemeId(c.themeId);
          setHandle(c.handle);
          setTitle(c.title);
          setCarouselId(c.id);
          setCreatedAt(c.createdAt);
          return;
        }
      }
      const d = loadDraft();
      if (d?.slides?.length) {
        setSlides(d.slides);
        setHandle(d.handle || initialHandle);
      }
    })();
  }, [initialHandle, loadId]);

  const theme = getTheme(themeId);
  const total = slides.length;
  const idx = Math.min(sel, total - 1);
  const current = slides[idx];

  function patch(p: Partial<Slide>) {
    setSlides((s) => s.map((sl, i) => (i === idx ? { ...sl, ...p } : sl)));
  }
  function add() {
    setSlides((s) => [...s, { kind: "argument", kicker: "POINT", title: "", body: "New point" }]);
    setSel(total);
  }
  function remove(i: number) {
    if (total <= 1) return;
    setSlides((s) => s.filter((_, k) => k !== i));
    setSel(Math.max(0, i - 1));
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
  }

  async function downloadAll() {
    setBusy(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < slides.length; i++) {
        const res = await fetch(slideSrc({ slide: slides[i], themeId, index: i, total, handle }));
        if (!res.ok) throw new Error(`slide ${i + 1} failed to render`);
        zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, await res.blob());
      }
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
      const res = await fetch(slideSrc({ slide: slides[i], themeId, index: i, total, handle }));
      if (!res.ok) throw new Error("render failed");
      download(await res.blob(), `slide-${String(i + 1).padStart(2, "0")}.png`);
    } catch (e) {
      alert("Render failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setSaveMsg(null);
    try {
      const id = carouselId ?? nanoid();
      const c: Carousel = {
        id,
        title: title.trim() || slides[0]?.title?.slice(0, 60) || "Untitled",
        slides,
        themeId,
        handle,
        createdAt: createdAt ?? new Date().toISOString(),
      };
      await saveCarousel(c);
      setCarouselId(id);
      setCreatedAt(c.createdAt);
      setSaveMsg("Saved");
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
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
          <div className="flex gap-2">
            <button
              onClick={() => downloadOne(idx)}
              disabled={busy}
              className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50"
            >
              Slide PNG
            </button>
            <button
              onClick={downloadAll}
              disabled={busy}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Rendering…" : "Download all (.zip)"}
            </button>
          </div>
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
          onChange={(e) => setHandle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm"
        />
      </aside>
    </div>
  );
}
