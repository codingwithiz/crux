"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { SlideCanvas } from "@/components/carousel/SlideCanvas";
import { BrandPicker } from "@/components/carousel/BrandPicker";
import {
  DESIGNS,
  getDesign,
  MODULE_TYPES,
  type CarouselSlide,
  type ModuleType,
  type SlideLayout,
  type SlideModule,
} from "@/lib/carousel/design";
import { applyBrand } from "@/lib/carousel/brand";
import { slideToBlob, downloadBlob } from "@/lib/carousel/export";
import { buildCaption } from "@/lib/carousel/caption";
import { loadDraft } from "@/lib/draft";
import { saveCarousel, getCarousel, uploadCarouselImages } from "@/lib/carousels";
import { getSettings, saveSettings } from "@/lib/settings";
import { getVoice, effectiveVoice } from "@/lib/voice";
import { fillModule } from "@/lib/express-client";

const LAYOUTS: SlideLayout[] = ["hero", "explainer", "statement", "cta"];

// Content-aware: seed the module from THIS slide's headline/body so switching
// type produces relevant data, not a generic placeholder.
function defaultModule(type: ModuleType, slide: CarouselSlide): SlideModule {
  const body = (slide.body || "").trim();
  const head = slide.headline.trim();
  const sents = body.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const points = (sents.length ? sents : [head]).slice(0, 4);
  const m = `${body} ${head}`.match(/\d+(?:\.\d+)?%?/);
  const num = m ? m[0] : "";
  const shortHead = head.length <= 42 ? head : head.slice(0, 40) + "…";
  const firstWords = (s: string, n: number) => s.split(/\s+/).slice(0, n).join(" ");
  switch (type) {
    case "callout":
      return { type: "callout", title: shortHead, body: body || head, tone: "neutral" };
    case "comparison":
      return { type: "comparison", left: { title: "The common view", items: [points[0] ?? "What most people assume"] }, right: { title: "My take", items: [points[1] ?? head] } };
    case "keyValue":
      return { type: "keyValue", heading: shortHead, rows: points.slice(0, 3).map((p, i) => ({ key: `point ${i + 1}`, value: p.slice(0, 70) })) };
    case "timeline":
      return { type: "timeline", steps: points.slice(0, 4).map((p, i) => ({ label: `Step ${i + 1}`, sub: firstWords(p, 5) })) };
    case "iconFlow":
      return { type: "iconFlow", steps: points.slice(0, 4).map((p) => ({ label: firstWords(p, 2) })) };
    case "bigStat":
      return { type: "bigStat", value: num || "2x", label: shortHead };
    case "donut":
      return { type: "donut", value: num.includes("%") ? Math.min(100, parseInt(num, 10) || 50) : 50, label: body || head };
    case "statBars":
      return { type: "statBars", rows: points.slice(0, 3).map((p, i) => ({ label: firstWords(p, 3), value: "", pct: 100 - i * 35, tone: i === 0 ? "bad" : "good" })) };
    case "barChart":
      return { type: "barChart", bars: points.slice(0, 4).map((p, i) => ({ label: firstWords(p, 2), value: 100 - i * 25 })) };
    case "lineChart":
      return { type: "lineChart", labels: ["start", "mid", "now"], series: [{ points: [20, 55, 100] }] };
  }
}

export function CarouselStudio({
  initialSlides,
  initialHandle = "@you",
  loadId,
}: {
  initialSlides: CarouselSlide[];
  initialHandle?: string;
  loadId?: string;
}) {
  const [slides, setSlides] = useState<CarouselSlide[]>(initialSlides);
  const [handle, setHandle] = useState(initialHandle);
  const [designId, setDesignId] = useState(DESIGNS[0].id);
  const [sel, setSel] = useState(0);
  const [title, setTitle] = useState("");
  const [carouselId, setCarouselId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [revoicing, setRevoicing] = useState(false);
  const [revoiceMsg, setRevoiceMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [brandLock, setBrandLock] = useState(false);
  const loaded = useRef(false);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewWrap = useRef<HTMLDivElement>(null);
  const [previewW, setPreviewW] = useState(900);
  const slidesRef = useRef(slides);
  const history = useRef<CarouselSlide[][]>([]);
  const [histLen, setHistLen] = useState(0);
  const [fillingModule, setFillingModule] = useState(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void (async () => {
      const lock = getSettings().brandLockDesignId;
      setBrandLock(!!lock);
      const lockValid = lock && DESIGNS.some((x) => x.id === lock) ? lock : null;
      if (loadId) {
        const c = await getCarousel(loadId);
        if (c) {
          setSlides(c.slides);
          setDesignId(c.designId || DESIGNS[0].id);
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
        // Brand-lock pins one style for new carousels; else use the LLM's per-topic pick.
        setDesignId(lockValid ?? d.designId ?? DESIGNS[0].id);
      } else if (lockValid) {
        setDesignId(lockValid);
      }
    })();
  }, [loadId, initialHandle]);

  // Responsive preview: scale the 1080px slide to the available width.
  useEffect(() => {
    const el = previewWrap.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setPreviewW(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mirror current slides for the undo snapshotter (ref write in an effect, not during render).
  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  const total = slides.length;
  const idx = Math.min(sel, total - 1);
  const current = slides[idx];
  const designFor = (s: CarouselSlide) => applyBrand(getDesign(designId), s.brand);

  function patch(p: Partial<CarouselSlide>) {
    setSlides((arr) => arr.map((s, i) => (i === idx ? { ...s, ...p } : s)));
  }
  function setModule(m: SlideModule | undefined) {
    patch({ module: m });
  }
  // Undo history — snapshots before structural changes (add/remove/move/layout/module/revoice).
  function updateSlides(updater: (s: CarouselSlide[]) => CarouselSlide[]) {
    history.current.push(slidesRef.current);
    if (history.current.length > 60) history.current.shift();
    setHistLen(history.current.length);
    setSlides(updater(slidesRef.current));
  }
  function patchTracked(p: Partial<CarouselSlide>) {
    updateSlides((arr) => arr.map((s, i) => (i === idx ? { ...s, ...p } : s)));
  }
  function undo() {
    const prev = history.current.pop();
    if (!prev) return;
    setHistLen(history.current.length);
    setSlides(prev);
  }
  // Switch a slide's module: instant content-aware heuristic (one undo entry),
  // then upgrade it in place with LLM-filled, slide-specific data.
  async function switchModule(t: string) {
    if (t === "none") {
      patchTracked({ module: undefined });
      return;
    }
    const slide = current;
    const at = idx;
    patchTracked({ module: defaultModule(t as ModuleType, slide) });
    setFillingModule(true);
    const filled = await fillModule(slide, t);
    setFillingModule(false);
    if (filled) setSlides((arr) => arr.map((s, i) => (i === at ? { ...s, module: filled } : s)));
  }
  function pickDesign(id: string) {
    setDesignId(id);
    if (brandLock) saveSettings({ ...getSettings(), brandLockDesignId: id });
  }
  function toggleLock() {
    if (brandLock) {
      saveSettings({ ...getSettings(), brandLockDesignId: undefined });
      setBrandLock(false);
    } else {
      saveSettings({ ...getSettings(), brandLockDesignId: designId });
      setBrandLock(true);
    }
  }
  function add() {
    updateSlides((arr) => [...arr, { layout: "explainer", kicker: "POINT", headline: "New point" }]);
    setSel(total);
  }
  function remove(i: number) {
    if (total <= 1) return;
    updateSlides((arr) => arr.filter((_, k) => k !== i));
    setSel(Math.max(0, i - 1));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= total) return;
    updateSlides((arr) => {
      const n = [...arr];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    setSel(j);
  }

  async function blobsForAll(): Promise<Blob[]> {
    const out: Blob[] = [];
    for (let i = 0; i < total; i++) {
      const node = exportRefs.current[i];
      if (node) out.push(await slideToBlob(node));
    }
    return out;
  }

  async function downloadAll() {
    setBusy(true);
    try {
      const blobs = await blobsForAll();
      const zip = new JSZip();
      blobs.forEach((b, i) => zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, b));
      downloadBlob(await zip.generateAsync({ type: "blob" }), (title || "carousel") + ".zip");
    } catch (e) {
      alert("Export failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function downloadOne(i: number) {
    setBusy(true);
    try {
      const node = exportRefs.current[i];
      if (!node) throw new Error("not rendered");
      downloadBlob(await slideToBlob(node), `slide-${String(i + 1).padStart(2, "0")}.png`);
    } catch (e) {
      alert("Export failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(buildCaption(slides, handle));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
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
      const j = (await res.json()) as { slides?: CarouselSlide[]; error?: string };
      if (!res.ok || !j.slides?.length) {
        throw new Error(j.error === "no_model" ? "No model key — add one in the Model menu (top-right)." : j.error || "Re-voice failed");
      }
      updateSlides(() => j.slides!);
      setRevoiceMsg("Rewritten in your voice.");
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
      const id = carouselId ?? crypto.randomUUID();
      let imageUrls: string[] | undefined;
      try {
        const urls = await uploadCarouselImages(id, await blobsForAll());
        if (urls.length) imageUrls = urls;
      } catch {
        /* not signed in / storage off — keep editable data only */
      }
      const created = createdAt ?? new Date().toISOString();
      await saveCarousel({
        id,
        title: title.trim() || slides[0]?.headline?.slice(0, 60) || "Untitled",
        slides,
        designId,
        handle,
        createdAt: created,
        imageUrls,
      });
      setCarouselId(id);
      setCreatedAt(created);
      setSaveMsg(imageUrls ? "Saved + images uploaded" : "Saved");
    } catch (e) {
      setSaveMsg("Save failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const big = Math.max(0.18, Math.min(previewW / 1080, 0.46));
  const thumb = 0.12;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Hidden full-size renders used for client-side PNG export. */}
      <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}>
        {slides.map((s, i) => (
          <SlideCanvas key={i} slide={s} design={designFor(s)} index={i} total={total} handle={handle} innerRef={(el) => { exportRefs.current[i] = el; }} />
        ))}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Carousel title"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface/40 px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button onClick={undo} disabled={histLen === 0} title="Undo last change" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-40">
            ↶ Undo
          </button>
          <button onClick={copyCaption} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface">
            {copied ? "Copied ✓" : "Copy caption"}
          </button>
          <button onClick={save} disabled={busy} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50">
            {busy ? "…" : carouselId ? "Update" : "Save"}
          </button>
          <button onClick={downloadAll} disabled={busy} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50">
            {busy ? "Preparing…" : "Download all (.zip)"}
          </button>
        </div>
        {saveMsg && (
          <p className="mb-3 text-xs text-muted">
            {saveMsg}
            {saveMsg.startsWith("Saved") && (
              <Link href="/gallery" className="ml-2 text-accent underline-offset-4 hover:underline">View in Library →</Link>
            )}
          </p>
        )}

        {/* Design picker */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Style</span>
          {DESIGNS.map((d) => (
            <button
              key={d.id}
              onClick={() => pickDesign(d.id)}
              title={d.name}
              className={`h-7 w-7 rounded-full border-2 ${designId === d.id ? "border-fg" : "border-line"}`}
              style={{ background: d.bg }}
            >
              <span className="block h-full w-full rounded-full" style={{ boxShadow: `inset 0 0 0 3px ${d.accent}` }} />
            </button>
          ))}
          <button
            onClick={toggleLock}
            title="Pin this style for all your carousels (brand-lock)"
            className={`ml-1 rounded-lg border px-2.5 py-1 text-xs transition ${brandLock ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"}`}
          >
            {brandLock ? "🔒 Style locked" : "Lock style"}
          </button>
        </div>

        {/* Big preview */}
        <div ref={previewWrap} className="flex justify-center rounded-2xl border border-line bg-surface/40 p-3 sm:p-6">
          <div className="shadow-2xl" style={{ width: 1080 * big, height: 1350 * big, overflow: "hidden", borderRadius: 14 }}>
            <div style={{ width: 1080, height: 1350, transform: `scale(${big})`, transformOrigin: "top left" }}>
              <SlideCanvas slide={current} design={designFor(current)} index={idx} total={total} handle={handle} />
            </div>
          </div>
        </div>

        {/* Thumbnails */}
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setSel(i)}
              className={`shrink-0 overflow-hidden rounded-md ${i === idx ? "ring-2 ring-accent" : "ring-1 ring-line"}`}
              style={{ width: 1080 * thumb, height: 1350 * thumb }}
            >
              <div style={{ width: 1080, height: 1350, transform: `scale(${thumb})`, transformOrigin: "top left" }}>
                <SlideCanvas slide={s} design={designFor(s)} index={i} total={total} handle={handle} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <aside className="h-fit rounded-2xl border border-line bg-surface/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Slide {idx + 1} / {total}</h2>
          <div className="flex gap-1">
            <button onClick={() => move(idx, -1)} className="rounded px-2 py-1 text-xs text-muted hover:bg-surface" title="Move left">←</button>
            <button onClick={() => move(idx, 1)} className="rounded px-2 py-1 text-xs text-muted hover:bg-surface" title="Move right">→</button>
            <button onClick={() => void downloadOne(idx)} className="rounded px-2 py-1 text-xs text-muted hover:bg-surface" title="Download this slide PNG">↓</button>
            <button onClick={() => remove(idx)} className="rounded px-2 py-1 text-xs text-red-400 hover:bg-surface" title="Delete">✕</button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => void revoice()} disabled={revoicing} className="rounded-lg bg-cool/15 px-3 py-1.5 text-xs font-medium text-cool ring-1 ring-cool/40 transition hover:bg-cool/25 disabled:opacity-50">
            {revoicing ? "Rewriting…" : "✶ Rewrite in my voice"}
          </button>
          <a href="/voice" className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline">edit voice →</a>
        </div>
        {revoiceMsg && <p className="mt-1 text-xs text-cool">{revoiceMsg}</p>}

        <Label>Layout</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {LAYOUTS.map((l) => (
            <button key={l} onClick={() => patchTracked({ layout: l })} className={`rounded-md border px-2 py-1 text-xs capitalize ${(current.layout ?? "explainer") === l ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"}`}>{l}</button>
          ))}
        </div>

        <Label>Kicker</Label>
        <Input value={current.kicker ?? ""} onChange={(v) => patch({ kicker: v })} />

        <Label>Headline</Label>
        <Area value={current.headline} onChange={(v) => patch({ headline: v })} rows={2} />

        <Label>Body</Label>
        <Area value={current.body ?? ""} onChange={(v) => patch({ body: v })} rows={3} />

        <Label>Highlight phrase (in headline)</Label>
        <Input value={current.highlight ?? ""} onChange={(v) => patch({ highlight: v || undefined })} />
        <div className="mt-1 flex gap-1">
          {(["yellow", "pink"] as const).map((t) => (
            <button key={t} onClick={() => patch({ highlightTone: t })} className={`rounded-md border px-2 py-0.5 text-[11px] capitalize ${current.highlightTone === t ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"}`}>{t}</button>
          ))}
        </div>

        <Label>Underline phrase (in headline)</Label>
        <Input value={current.underline ?? ""} onChange={(v) => patch({ underline: v || undefined })} />

        <Label>Brand (logo + name on the slide)</Label>
        <BrandPicker value={current.brand} onChange={(b) => patch({ brand: b })} />

        <Label>Visual module</Label>
        <select
          value={current.module?.type ?? "none"}
          onChange={(e) => void switchModule(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm"
        >
          <option value="none">None (text only)</option>
          {MODULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {fillingModule && <p className="mt-1 text-[11px] text-cool">Generating relevant data for this module…</p>}

        {current.module?.type === "callout" && (
          <ModuleEdit>
            <Label>Callout title</Label>
            <Input value={current.module.title} onChange={(v) => setModule({ ...current.module!, type: "callout", title: v } as SlideModule)} />
            <Label>Callout body</Label>
            <Area value={current.module.body ?? ""} onChange={(v) => setModule({ type: "callout", title: (current.module as { title: string }).title, body: v, tone: (current.module as { tone?: "good" | "bad" | "neutral" }).tone })} rows={2} />
          </ModuleEdit>
        )}
        {current.module?.type === "comparison" && (
          <ModuleEdit>
            <Label>Left title</Label>
            <Input value={current.module.left.title} onChange={(v) => setModule({ type: "comparison", left: { ...(current.module as Extract<SlideModule, { type: "comparison" }>).left, title: v }, right: (current.module as Extract<SlideModule, { type: "comparison" }>).right })} />
            <Label>Left items (one per line)</Label>
            <Area value={current.module.left.items.join("\n")} onChange={(v) => setModule({ type: "comparison", left: { ...(current.module as Extract<SlideModule, { type: "comparison" }>).left, items: v.split("\n").filter(Boolean) }, right: (current.module as Extract<SlideModule, { type: "comparison" }>).right })} rows={3} />
            <Label>Right title</Label>
            <Input value={current.module.right.title} onChange={(v) => setModule({ type: "comparison", right: { ...(current.module as Extract<SlideModule, { type: "comparison" }>).right, title: v }, left: (current.module as Extract<SlideModule, { type: "comparison" }>).left })} />
            <Label>Right items (one per line)</Label>
            <Area value={current.module.right.items.join("\n")} onChange={(v) => setModule({ type: "comparison", right: { ...(current.module as Extract<SlideModule, { type: "comparison" }>).right, items: v.split("\n").filter(Boolean) }, left: (current.module as Extract<SlideModule, { type: "comparison" }>).left })} rows={3} />
          </ModuleEdit>
        )}
        {current.module?.type === "bigStat" && (
          <ModuleEdit>
            <Label>Big number</Label>
            <Input value={current.module.value} onChange={(v) => setModule({ type: "bigStat", value: v, label: (current.module as Extract<SlideModule, { type: "bigStat" }>).label })} />
            <Label>Label</Label>
            <Input value={current.module.label} onChange={(v) => setModule({ type: "bigStat", value: (current.module as Extract<SlideModule, { type: "bigStat" }>).value, label: v })} />
          </ModuleEdit>
        )}
        {current.module?.type === "donut" && (
          <ModuleEdit>
            <Label>Percent (0–100)</Label>
            <Input value={String(current.module.value)} onChange={(v) => setModule({ type: "donut", value: Number(v) || 0, label: (current.module as Extract<SlideModule, { type: "donut" }>).label, caption: (current.module as Extract<SlideModule, { type: "donut" }>).caption })} />
            <Label>Label</Label>
            <Input value={current.module.label} onChange={(v) => setModule({ type: "donut", value: (current.module as Extract<SlideModule, { type: "donut" }>).value, label: v, caption: (current.module as Extract<SlideModule, { type: "donut" }>).caption })} />
          </ModuleEdit>
        )}
        {current.module?.type === "keyValue" && (
          <ModuleEdit>
            <Label>Rows (key = value per line)</Label>
            <Area rows={4} value={current.module.rows.map((r) => `${r.key} = ${r.value}`).join("\n")} onChange={(v) => setModule({ type: "keyValue", heading: (current.module as Extract<SlideModule, { type: "keyValue" }>).heading, caption: (current.module as Extract<SlideModule, { type: "keyValue" }>).caption, rows: v.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => { const i = line.indexOf("="); return i < 0 ? { key: line, value: "" } : { key: line.slice(0, i).trim(), value: line.slice(i + 1).trim() }; }) })} />
          </ModuleEdit>
        )}
        {current.module?.type === "timeline" && (
          <ModuleEdit>
            <Label>Steps (label | sub per line)</Label>
            <Area rows={4} value={current.module.steps.map((s) => (s.sub ? `${s.label} | ${s.sub}` : s.label)).join("\n")} onChange={(v) => setModule({ type: "timeline", steps: v.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => { const [l, ...r] = line.split("|"); return { label: (l ?? "").trim(), sub: r.length ? r.join("|").trim() : undefined }; }) })} />
          </ModuleEdit>
        )}
        {current.module?.type === "iconFlow" && (
          <ModuleEdit>
            <Label>Steps (label | logo-slug per line)</Label>
            <Area rows={4} value={current.module.steps.map((s) => (s.slug ? `${s.label} | ${s.slug}` : s.label)).join("\n")} onChange={(v) => setModule({ type: "iconFlow", steps: v.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => { const [l, ...r] = line.split("|"); return { label: (l ?? "").trim(), slug: r.length ? r.join("|").trim() : undefined }; }) })} />
          </ModuleEdit>
        )}
        {current.module?.type === "statBars" && (
          <ModuleEdit>
            <Label>Bars (label | value | pct per line)</Label>
            <Area rows={4} value={current.module.rows.map((r) => `${r.label} | ${r.value} | ${r.pct}`).join("\n")} onChange={(v) => setModule({ type: "statBars", caption: (current.module as Extract<SlideModule, { type: "statBars" }>).caption, rows: v.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => { const [l, val, pct] = line.split("|"); return { label: (l ?? "").trim(), value: (val ?? "").trim(), pct: Number((pct ?? "").trim()) || 0 }; }) })} />
          </ModuleEdit>
        )}
        {(current.module?.type === "barChart" || current.module?.type === "lineChart") && (
          <p className="mt-2 text-[11px] text-muted">
            <span className="font-mono text-fg">{current.module.type}</span> uses real numbers — regenerate or revoice to refine its data.
          </p>
        )}

        <button onClick={add} className="mt-4 w-full rounded-lg border border-dashed border-line py-2 text-sm text-muted hover:bg-surface hover:text-fg">+ Add slide</button>

        <Label>Handle</Label>
        <Input value={handle} onChange={setHandle} />
      </aside>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mt-4 block text-xs font-medium text-muted">{children}</label>;
}
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent" />;
}
function Area({ value, onChange, rows }: { value: string; onChange: (v: string) => void; rows: number }) {
  return <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent" />;
}
function ModuleEdit({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 rounded-lg border border-line bg-ink/40 p-3">{children}</div>;
}
