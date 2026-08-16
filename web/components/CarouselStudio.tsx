"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { SlideCanvas } from "@/components/carousel/SlideCanvas";
import { BrandPicker } from "@/components/carousel/BrandPicker";
import { DesignSwatch } from "@/components/carousel/DesignSwatch";
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
import { SLIDE_SIZES, DEFAULT_SLIDE_SIZE, slideDims, type SlideSize } from "@/lib/carousel/size";
import { slideToBlob, downloadBlob, nodesToPdf } from "@/lib/carousel/export";
import { toast } from "sonner";
import { buildCaption } from "@/lib/carousel/caption";
import { loadDraft, type DraftContext } from "@/lib/draft";
import { saveCarousel, getCarousel, uploadCarouselImages } from "@/lib/carousels";
import { getSettings, saveSettings } from "@/lib/settings";
import { getVoice, effectiveVoice } from "@/lib/voice";
import { fillModule, expressVariants, type Variant } from "@/lib/express-client";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/ui/Button";
import { PenLine, ChevronDown } from "lucide-react";

const LAYOUTS: SlideLayout[] = ["hero", "explainer", "statement", "cta"];

/** Which long-running action is in flight, so only its own button says so. */
type Job = "save" | "pdf" | "zip" | "one" | null;

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
  initialSlides = [],
  initialHandle = "@you",
  loadId,
}: {
  initialSlides?: CarouselSlide[];
  initialHandle?: string;
  loadId?: string;
}) {
  const [slides, setSlides] = useState<CarouselSlide[]>(initialSlides);
  // The load below is async, so "no slides" is also true on first paint for
  // someone who does have a draft. Gate the empty state on this so it can't
  // flash. (`loaded` is a ref and wouldn't re-render.)
  const [hydrated, setHydrated] = useState(false);
  const [handle, setHandle] = useState(initialHandle);
  const [designId, setDesignId] = useState(DESIGNS[0].id);
  const [sel, setSel] = useState(0);
  const [title, setTitle] = useState("");
  const [carouselId, setCarouselId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  // One flag per action, not one shared flag: with a single `busy`, clicking
  // PDF put "Preparing…" on the .zip button next to it, so the app appeared to
  // be doing something the user had not asked for.
  const [job, setJob] = useState<Job>(null);
  const [exporting, setExporting] = useState(false);
  const busy = job !== null;
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [revoicing, setRevoicing] = useState(false);
  const [revoiceMsg, setRevoiceMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [brandLock, setBrandLock] = useState(false);
  const loaded = useRef(false);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewWrap = useRef<HTMLDivElement>(null);
  // Starts at 0: seeding a desktop width made the first frame render a preview
  // wider than a phone's column, giving the page a horizontal scrollbar.
  const [previewW, setPreviewW] = useState(0);
  const slidesRef = useRef(slides);
  const designIdRef = useRef(designId);
  // Undo restores the style as well as the copy: applying a variant changes both
  // at once, and an undo that put back the words but kept the new style would
  // leave you somewhere you had never been.
  const history = useRef<{ slides: CarouselSlide[]; designId: string }[]>([]);
  const [histLen, setHistLen] = useState(0);
  const [fillingModule, setFillingModule] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);
  const [direction, setDirection] = useState("");
  const [revising, setRevising] = useState<"deck" | "slide" | null>(null);
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [variantJob, setVariantJob] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  /** Deck shape. Stored on the slides themselves, so it survives save/reload. */
  const [size, setSize] = useState<SlideSize>(DEFAULT_SLIDE_SIZE);
  /** The deck as it was before you applied a variant, so you can put it back. */
  const [previous, setPrevious] = useState<Variant | null>(null);
  const [context, setContext] = useState<DraftContext | undefined>(undefined);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void (async () => {
      try {
        const lock = getSettings().brandLockDesignId;
        setBrandLock(!!lock);
        const lockValid = lock && DESIGNS.some((x) => x.id === lock) ? lock : null;
        if (loadId) {
          const c = await getCarousel(loadId);
          if (c) {
            setSlides(c.slides);
            setSize(c.slides[0]?.size ?? DEFAULT_SLIDE_SIZE);
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
          setSize(d.size ?? d.slides[0]?.size ?? DEFAULT_SLIDE_SIZE);
          setHandle(d.handle || initialHandle);
          // What it was made from, when the flow passed it along. Decks reopened
          // from the Library have none, which is why "another version" is a
          // conditional button rather than one that fails when pressed.
          setContext(d.context);
          // Brand-lock pins one style for new carousels; else use the LLM's per-topic pick.
          setDesignId(lockValid ?? d.designId ?? DESIGNS[0].id);
        } else if (lockValid) {
          setDesignId(lockValid);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, [loadId, initialHandle]);

  // Responsive preview: scale the slide to the available width.
  //
  // Keyed on `hydrated`, not []: this component early-returns an empty state
  // until the draft loads, so on first mount `previewWrap.current` is null and
  // a one-shot effect observed nothing — leaving previewW at 0 and the preview
  // pinned to its minimum scale forever.
  useEffect(() => {
    const el = previewWrap.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setPreviewW(e.contentRect.width);
    });
    ro.observe(el);
    setPreviewW(el.clientWidth);
    return () => ro.disconnect();
  }, [hydrated]);

  // Mirror current slides + style for the undo snapshotter (ref writes in an
  // effect, not during render).
  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);
  useEffect(() => {
    designIdRef.current = designId;
  }, [designId]);

  const total = slides.length;
  const idx = Math.min(sel, total - 1);
  const current = slides[idx];
  // A slide may opt out of the deck's style; unset means "follow the deck".
  const designFor = (s: CarouselSlide) => applyBrand(getDesign(s.designId ?? designId), s.brand);

  function patch(p: Partial<CarouselSlide>) {
    setSlides((arr) => arr.map((s, i) => (i === idx ? { ...s, ...p } : s)));
  }
  function setModule(m: SlideModule | undefined) {
    patch({ module: m });
  }
  // Undo history — snapshots before structural changes (add/remove/move/layout/
  // module/revoice/revise/variant).
  function snapshot() {
    history.current.push({ slides: slidesRef.current, designId: designIdRef.current });
    if (history.current.length > 60) history.current.shift();
    setHistLen(history.current.length);
  }
  function updateSlides(updater: (s: CarouselSlide[]) => CarouselSlide[]) {
    snapshot();
    setSlides(updater(slidesRef.current));
  }
  function patchTracked(p: Partial<CarouselSlide>) {
    updateSlides((arr) => arr.map((s, i) => (i === idx ? { ...s, ...p } : s)));
  }
  function undo() {
    const prev = history.current.pop();
    if (!prev) return;
    setHistLen(history.current.length);
    setSlides(prev.slides);
    setDesignId(prev.designId);
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
  /** Stamp the shape on every slide — that's what carries it through save. */
  function pickSize(next: SlideSize) {
    setSize(next);
    updateSlides((arr) => arr.map((sl) => ({ ...sl, size: next })));
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
  /** Drag a thumbnail onto another position. The ←/→ buttons stay: dragging is
   *  the fast path on a desktop and unavailable on touch. */
  function moveTo(from: number, to: number) {
    if (from === to || to < 0 || to >= total) return;
    updateSlides((arr) => {
      const n = [...arr];
      n.splice(to, 0, ...n.splice(from, 1));
      return n;
    });
    setSel(to);
  }

  /**
   * Mount the hidden full-size render tree, hand its nodes to `run`, unmount.
   *
   * It used to stay mounted permanently: for a nine-slide deck that is nine
   * extra 1080×1350 trees — each with SVG decoration, a grain overlay and
   * possibly a CDN logo — laid out and composited at all times. That, more than
   * button sizes, is what made the Studio crawl on a phone. Two frames of wait
   * is enough for React to commit and the refs to exist.
   */
  async function withExportNodes<T>(run: (nodes: HTMLElement[]) => Promise<T>): Promise<T> {
    setExporting(true);
    try {
      exportRefs.current = [];
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const nodes = exportRefs.current.slice(0, total).filter(Boolean) as HTMLElement[];
      if (nodes.length < total) throw new Error("slides aren't ready yet — try again");
      return await run(nodes);
    } finally {
      setExporting(false);
    }
  }

  /** Run an export, owning the button state and surfacing failures. */
  async function runExport(kind: Job, run: (nodes: HTMLElement[]) => Promise<void>) {
    setJob(kind);
    try {
      await withExportNodes(run);
    } catch (e) {
      toast.error("Export failed: " + (e as Error).message);
    } finally {
      setJob(null);
    }
  }

  const downloadAll = () =>
    runExport("zip", async (nodes) => {
      const zip = new JSZip();
      for (let i = 0; i < nodes.length; i++) {
        zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, await slideToBlob(nodes[i]));
      }
      downloadBlob(await zip.generateAsync({ type: "blob" }), (title || "carousel") + ".zip");
    });

  // LinkedIn carousels are PDFs, so PNGs meant a manual conversion every post.
  const downloadPdf = () =>
    runExport("pdf", async (nodes) => {
      downloadBlob(await nodesToPdf(nodes), (title || "carousel") + ".pdf");
    });

  const downloadOne = (i: number) =>
    runExport("one", async (nodes) => {
      downloadBlob(await slideToBlob(nodes[i]), `slide-${String(i + 1).padStart(2, "0")}.png`);
    });

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(buildCaption(slides, handle));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  /**
   * Rewrite copy through /api/revoice — in the user's voice, or toward a
   * direction they typed, for the whole deck or one slide.
   *
   * One call site for all four combinations because the route treats them the
   * same way: it returns only headline/body/kicker and merges them onto the
   * slides we sent, so nothing a direction says can alter the layout, the module
   * data or the slide count.
   */
  async function rewrite(opts: { direction?: string; only?: number } = {}) {
    const scope = opts.only !== undefined ? "slide" : "deck";
    const target = opts.only !== undefined ? [slides[opts.only]] : slides;
    if (opts.direction !== undefined) setRevising(scope);
    else setRevoicing(true);
    setRevoiceMsg(null);
    try {
      const voice = effectiveVoice(await getVoice().catch(() => null));
      const res = await fetch("/api/revoice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slides: target,
          direction: opts.direction,
          context: context && { thesis: context.thesis?.statement, sourceTitle: context.sourceTitle },
          settings: getSettings(),
          voice,
        }),
      });
      const j = (await res.json()) as { slides?: CarouselSlide[]; error?: string };
      if (!res.ok || !j.slides?.length) {
        throw new Error(
          j.error === "no_model"
            ? "No AI model is configured for this deployment."
            : j.error === "shape_mismatch"
              ? "That came back the wrong shape, so nothing was changed. Try rewording it."
              : j.error || "Rewrite failed",
        );
      }
      const next = j.slides;
      if (opts.only !== undefined) {
        updateSlides((arr) => arr.map((s, i) => (i === opts.only ? { ...s, ...next[0] } : s)));
      } else {
        updateSlides(() => next);
      }
      setRevoiceMsg(
        opts.direction
          ? scope === "slide"
            ? "This slide rewritten."
            : "Rewritten with your direction."
          : "Rewritten in your voice.",
      );
      if (opts.direction) setDirection("");
    } catch (e) {
      setRevoiceMsg((e as Error).message);
    } finally {
      setRevising(null);
      setRevoicing(false);
    }
  }

  /**
   * Two more takes on the same source material, deliberately in different
   * formats and styles — for when the deck is fine but isn't the one you wanted.
   * Only offered when the Studio knows what the deck was made from.
   */
  async function tryVariants() {
    if (!context) return;
    setVariantJob(true);
    setRevoiceMsg(null);
    try {
      const got = await expressVariants(context, {
        formats: [context.format].filter(Boolean) as string[],
        designIds: [designId],
      });
      setVariants(got);
    } catch (e) {
      setRevoiceMsg((e as Error).message);
    } finally {
      setVariantJob(false);
    }
  }

  /** Applying a variant swaps copy and style together — one undo entry. */
  function applyVariant(v: Variant) {
    snapshot();
    // Keep what you're replacing. Undo already restored it, but undo is
    // invisible and one-shot — you couldn't look at the old one and decide.
    setPrevious({ slides: slidesRef.current, designId: designIdRef.current, format: context?.format });
    setSlides(v.slides);
    if (v.designId) setDesignId(v.designId);
    setContext((c) => c && { ...c, format: v.format });
    setSel(0);
    setVariants(null);
    setRevoiceMsg("Swapped in that version — undo puts the old one back.");
  }

  async function save() {
    setJob("save");
    setSaveMsg(null);
    try {
      const id = carouselId ?? crypto.randomUUID();
      let imageUrls: string[] | undefined;
      try {
        const blobs = await withExportNodes(async (nodes) => {
          const out: Blob[] = [];
          for (const n of nodes) out.push(await slideToBlob(n));
          return out;
        });
        const urls = await uploadCarouselImages(id, blobs);
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
      setJob(null);
    }
  }

  const dims = slideDims(size);
  // Fill the column rather than floating a postage stamp in the middle of it.
  const big = Math.max(0.2, Math.min((previewW - 8) / dims.w, 0.62));
  const thumb = 0.12;
  const thumbH = dims.h * thumb;

  // Must precede the editor: with no slides, `idx` is -1 and `current` is
  // undefined, which the JSX below dereferences. The load is async, so this also
  // covers the first paint — show a placeholder until we know whether there's a
  // draft, rather than flashing "nothing here" at someone who has one.
  if (total === 0) {
    if (!hydrated) {
      return (
        <div className="mx-auto max-w-2xl px-5 py-10">
          <Skeleton className="h-64" />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-2xl px-5 py-10">
        <EmptyState
          icon={PenLine}
          title="Nothing to edit yet"
          description="The Studio opens whatever you last made. Save a take and Crux drafts the carousel for you — then you tune it here."
          cta={{ href: "/think", label: "Start thinking" }}
        />
        <p className="mt-4 text-center text-sm text-muted">
          Already made one?{" "}
          <Link href="/gallery" className="underline-offset-4 hover:text-fg hover:underline">
            Open it from your Library
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Full-size renders for export — mounted only while one is running. */}
      {exporting && (
        <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}>
          {slides.map((s, i) => (
            <SlideCanvas key={i} slide={s} design={designFor(s)} index={i} total={total} handle={handle} size={size} innerRef={(el) => { exportRefs.current[i] = el; }} />
          ))}
        </div>
      )}

      <div className="min-w-0">
        {/* Six controls at one hierarchy level, so nothing looked like the main
            action and Undo sat between Save and the exports. Title leads, Save
            is primary, and the three ways of getting files out live together
            behind one Export menu. */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Carousel title"
            aria-label="Carousel title"
            className="w-full min-w-0 basis-full rounded-control border border-line bg-surface/40 px-3 py-2 font-serif text-lead outline-none focus:border-accent sm:basis-0 sm:flex-1"
          />
          <button
            onClick={undo}
            disabled={histLen === 0}
            title="Undo last change"
            aria-label="Undo last change"
            className="ce-press rounded-control border border-line px-3 py-1.5 text-sm transition hover:bg-surface disabled:opacity-40"
          >
            ↶ Undo
          </button>

          <details className="relative" open={exportOpen} onToggle={(e) => setExportOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary className="ce-press inline-flex cursor-pointer list-none items-center gap-1 rounded-control border border-line px-3 py-1.5 text-sm transition hover:bg-surface">
              Export <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-control border border-line bg-surface shadow-2xl">
              <button
                onClick={() => { setExportOpen(false); void downloadAll(); }}
                disabled={busy}
                className="block w-full px-3 py-2 text-left text-sm transition hover:bg-ink disabled:opacity-50"
              >
                {job === "zip" ? "Preparing…" : "All slides (.zip)"}
              </button>
              <button
                onClick={() => { setExportOpen(false); void downloadPdf(); }}
                disabled={busy}
                title="One multi-page PDF — what LinkedIn document posts take"
                className="block w-full px-3 py-2 text-left text-sm transition hover:bg-ink disabled:opacity-50"
              >
                {job === "pdf" ? "Building PDF…" : "PDF for LinkedIn"}
              </button>
              <button
                onClick={() => { setExportOpen(false); void copyCaption(); }}
                className="block w-full px-3 py-2 text-left text-sm transition hover:bg-ink"
              >
                {copied ? "Copied ✓" : "Copy the caption"}
              </button>
            </div>
          </details>

          {/* Save is the one primary here, so it uses the shared Button rather
              than a private copy of its class string. `loading` and `disabled`
              are separate on purpose: mid-save it keeps its fill and gains a
              spinner, but while some *other* export is running it is merely
              unavailable and recedes to an outline. */}
          <Button
            variant="primary"
            size="sm"
            onClick={save}
            disabled={busy}
            loading={job === "save"}
            loadingLabel="Saving…"
          >
            {carouselId ? "Update" : "Save"}
          </Button>
        </div>
        {saveMsg && (
          <p className="mb-3 text-xs text-muted">
            {saveMsg}
            {saveMsg.startsWith("Saved") && (
              <Link href="/gallery" className="ml-2 text-accent underline-offset-4 hover:underline">View in Library →</Link>
            )}
          </p>
        )}

        {/* Design picker. A scrolling strip rather than a wrapping grid: twelve
            labelled swatches wrap to four rows and push the canvas off screen,
            which is the thing you are actually trying to look at. */}
        <div className="mb-3">
          <span className="font-mono text-xs uppercase tracking-eyebrow text-muted">Style</span>
          <div className="ce-strip mt-1.5 flex gap-2 overflow-x-auto pb-2">
            {DESIGNS.map((d) => (
              <DesignSwatch
                key={d.id}
                design={d}
                selected={designId === d.id}
                onClick={() => pickDesign(d.id)}
              />
            ))}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Deck shape. Square is the safe universal — Instagram, LinkedIn
              documents and X all take it uncropped; 4:5 is the taller of the two
              ratios Instagram allows, so it occupies more of the feed. */}
          <span className="ml-1 inline-flex overflow-hidden rounded-control border border-line">
            {(Object.keys(SLIDE_SIZES) as SlideSize[]).map((k) => (
              <button
                key={k}
                onClick={() => pickSize(k)}
                title={SLIDE_SIZES[k].hint}
                aria-pressed={size === k}
                className={`px-2.5 py-1 text-xs transition ${
                  size === k ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface hover:text-fg"
                }`}
              >
                {SLIDE_SIZES[k].label}
              </button>
            ))}
          </span>
          <button
            onClick={toggleLock}
            title="Pin this style for all your carousels (brand-lock)"
            className={`ml-1 rounded-control border px-2.5 py-1 text-xs transition ${brandLock ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"}`}
          >
            {brandLock ? "🔒 Style locked" : "Lock style"}
          </button>
        </div>

        {/* Big preview */}
        <div ref={previewWrap} className="flex justify-center rounded-surface border border-line bg-surface/40 p-3 sm:p-6">
          <div className="shadow-2xl" style={{ width: dims.w * big, height: dims.h * big, overflow: "hidden", borderRadius: 14 }}>
            <div style={{ width: dims.w, height: dims.h, transform: `scale(${big})`, transformOrigin: "top left" }}>
              <SlideCanvas slide={current} design={designFor(current)} index={idx} total={total} handle={handle} size={size} />
            </div>
          </div>
        </div>

        {/* Not good enough? Say what to change. The deck is one roll of the dice
            otherwise — you could edit every word by hand or start over. */}
        <div className="mt-4 rounded-surface border border-line bg-surface/40 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (direction.trim()) void rewrite({ direction: direction.trim() });
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              maxLength={300}
              aria-label="Say how to change this deck"
              placeholder="Redo it, but… punchier / simpler / less hype"
              className="min-w-0 flex-1 basis-full rounded-control border border-line bg-ink px-3 py-2 text-base outline-none focus:border-accent sm:basis-0 sm:text-sm"
            />
            <button
              type="submit"
              disabled={!direction.trim() || revising !== null}
              className="ce-press shrink-0 rounded-control bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:brightness-110 disabled:opacity-50"
            >
              {revising === "deck" ? "Rewriting…" : "Redo the deck"}
            </button>
            <button
              type="button"
              onClick={() => direction.trim() && void rewrite({ direction: direction.trim(), only: idx })}
              disabled={!direction.trim() || revising !== null}
              title="Apply this direction to the slide you're on"
              className="shrink-0 rounded-control border border-line px-4 py-2 text-sm text-fg transition hover:bg-surface disabled:opacity-50"
            >
              {revising === "slide" ? "Rewriting…" : "This slide only"}
            </button>
          </form>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {["punchier", "simpler", "more concrete", "less hype", "funnier"].map((p) => (
              <button
                key={p}
                onClick={() => setDirection(p)}
                className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:bg-surface hover:text-fg"
              >
                {p}
              </button>
            ))}
            <span className="text-xs text-muted">· wording only — your layout and numbers stay put</span>
          </div>
        </div>

        {/* Thumbnails */}
        <div className="ce-strip mt-4 flex gap-3 overflow-x-auto px-0.5 pb-3 pt-0.5">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setSel(i)}
              // Drag to reorder. Native DnD needs no library, and the ←/→
              // buttons in the editor stay as the touch path.
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom !== null) moveTo(dragFrom, i);
                setDragFrom(null);
              }}
              onDragEnd={() => setDragFrom(null)}
              title="Drag to reorder"
              className={`shrink-0 cursor-grab overflow-hidden rounded-control active:cursor-grabbing ${
                i === idx ? "ring-2 ring-accent" : "ring-1 ring-line"
              } ${dragFrom === i ? "opacity-40" : ""}`}
              style={{ width: dims.w * thumb, height: thumbH }}
            >
              <div style={{ width: dims.w, height: dims.h, transform: `scale(${thumb})`, transformOrigin: "top left" }}>
                <SlideCanvas slide={s} design={designFor(s)} index={i} total={total} handle={handle} size={size} />
              </div>
            </button>
          ))}
        </div>

        {/* A different deck entirely, from the same material. Only possible when
            the Studio was handed what the deck was made from. */}
        {context && (
          <div className="mt-3">
            {variants ? (
              <div className="rounded-surface border border-cool/40 bg-cool/5 p-4">
                <p className="text-sm font-medium">Pick a version</p>
                <p className="mt-0.5 text-xs text-muted">
                  Same take, different structure and style. Whatever you pick, the one you had is
                  kept below so you can switch back.
                </p>
                <div className="mt-3 flex flex-wrap gap-4">
                  <VariantCard
                    label="What you have"
                    cta="keep this"
                    slide={slides[0]}
                    design={applyBrand(getDesign(designId), slides[0]?.brand)}
                    handle={handle}
                    size={size}
                    onPick={() => setVariants(null)}
                  />
                  {variants.map((v, i) => (
                    <VariantCard
                      key={i}
                      label={v.format ? v.format.replace(/[-_]/g, " ") : `Version ${i + 2}`}
                      cta="use this one"
                      slide={v.slides[0]}
                      design={applyBrand(getDesign(v.designId ?? designId), v.slides[0]?.brand)}
                      handle={handle}
                      size={size}
                      onPick={() => applyVariant(v)}
                    />
                  ))}
                </div>
              </div>
            ) : previous ? (
              /* After swapping, the deck you replaced stays on screen. Undo
                 already restored it, but undo is invisible and one-shot — you
                 could not look at the old one and then decide. */
              <div className="flex flex-wrap items-center gap-4 rounded-surface border border-line bg-surface/40 p-4">
                <VariantCard
                  label="Your previous version"
                  cta="switch back"
                  slide={previous.slides[0]}
                  design={applyBrand(getDesign(previous.designId ?? designId), previous.slides[0]?.brand)}
                  handle={handle}
                  size={size}
                  onPick={() => {
                    const back = previous;
                    snapshot();
                    setPrevious({ slides: slidesRef.current, designId: designIdRef.current, format: context?.format });
                    setSlides(back.slides);
                    if (back.designId) setDesignId(back.designId);
                    setSel(0);
                    setRevoiceMsg("Back to your previous version.");
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted">
                    Kept so you can compare. Press it to swap back — you can flip between the two as
                    often as you like.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => void tryVariants()}
                      disabled={variantJob}
                      className="rounded-control border border-line px-3 py-1.5 text-xs transition hover:bg-surface disabled:opacity-50"
                    >
                      {variantJob ? "Building…" : "Try 2 more"}
                    </button>
                    <button
                      onClick={() => setPrevious(null)}
                      className="rounded-control px-3 py-1.5 text-xs text-muted transition hover:text-fg"
                    >
                      Discard it
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => void tryVariants()}
                disabled={variantJob}
                title="Generates 2 alternative decks from the same take"
                className="rounded-control border border-line px-4 py-2 text-sm text-fg transition hover:bg-surface disabled:opacity-50"
              >
                {variantJob ? "Building 2 more versions…" : "Try 2 more versions"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Editor */}
      <aside className="h-fit min-w-0 rounded-surface border border-line bg-surface/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Slide {idx + 1} / {total}</h2>
          <div className="flex gap-1">
            <button onClick={() => move(idx, -1)} aria-label="Move slide left" className="rounded-control px-3 py-2 text-sm text-muted hover:bg-surface" title="Move left">←</button>
            <button onClick={() => move(idx, 1)} aria-label="Move slide right" className="rounded-control px-3 py-2 text-sm text-muted hover:bg-surface" title="Move right">→</button>
            <button onClick={() => void downloadOne(idx)} disabled={busy} aria-label="Download this slide" className="rounded-control px-3 py-2 text-sm text-muted hover:bg-surface disabled:opacity-40" title="Download this slide PNG">↓</button>
            {/* Separated and confirmed: at 24px beside the download arrow this
                deleted a slide on a mis-tap, with nothing to undo it on mobile. */}
            <button
              onClick={() => (confirmRemove === idx ? remove(idx) : setConfirmRemove(idx))}
              onBlur={() => confirmRemove === idx && setConfirmRemove(null)}
              aria-label="Delete slide"
              className={`ml-2 rounded-control px-3 py-2 text-sm hover:bg-surface ${confirmRemove === idx ? "bg-danger/15 text-danger" : "text-danger"}`}
              title="Delete slide"
            >
              {confirmRemove === idx ? "Delete?" : "✕"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => void rewrite()} disabled={revoicing} className="rounded-control bg-cool/15 px-3 py-1.5 text-xs font-medium text-cool ring-1 ring-cool/40 transition hover:bg-cool/25 disabled:opacity-50">
            {revoicing ? "Rewriting…" : "✶ Rewrite in my voice"}
          </button>
          <Link href="/voice" className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline">edit voice →</Link>
        </div>
        {revoiceMsg && <p className="mt-1 text-xs text-cool">{revoiceMsg}</p>}

        <Label>Layout</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {LAYOUTS.map((l) => (
            <button key={l} onClick={() => patchTracked({ layout: l })} className={`rounded-control border px-2 py-1 text-xs capitalize ${(current.layout ?? "explainer") === l ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"}`}>{l}</button>
          ))}
        </div>

        {/* One slide can step out of the deck's style — a cover that stands
            apart, a single quote in another world. */}
        <Label>This slide&rsquo;s style</Label>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => patchTracked({ designId: undefined })}
            className={`rounded-control border px-2 py-1 text-xs ${!current.designId ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"}`}
          >
            Same as deck
          </button>
          {DESIGNS.map((d) => (
            <DesignSwatch
              key={d.id}
              design={d}
              showName={false}
              selected={current.designId === d.id}
              onClick={() => patchTracked({ designId: d.id })}
            />
          ))}
        </div>

        <Label>Label</Label>
        <Input value={current.kicker ?? ""} onChange={(v) => patch({ kicker: v })} />

        <Label>Headline</Label>
        <Area value={current.headline} onChange={(v) => patch({ headline: v })} rows={2} />

        <Label>Body</Label>
        <Area value={current.body ?? ""} onChange={(v) => patch({ body: v })} rows={3} />

        <Label>Highlight phrase (in headline)</Label>
        <Input value={current.highlight ?? ""} onChange={(v) => patch({ highlight: v || undefined })} />
        <div className="mt-1 flex gap-1">
          {(["yellow", "pink"] as const).map((t) => (
            <button key={t} onClick={() => patch({ highlightTone: t })} className={`rounded-control border px-2 py-0.5 text-micro capitalize ${current.highlightTone === t ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"}`}>{t}</button>
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
          className="mt-1 w-full rounded-control border border-line bg-ink px-3 py-2 text-base sm:text-sm"
        >
          <option value="none">None (text only)</option>
          {MODULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {fillingModule && <p className="mt-1 text-micro text-cool">Generating relevant data for this module…</p>}

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
          <p className="mt-2 text-micro text-muted">
            <span className="font-mono text-fg">{current.module.type}</span> uses real numbers — regenerate or revoice to refine its data.
          </p>
        )}

        <button onClick={add} className="mt-4 w-full rounded-control border border-dashed border-line py-2 text-sm text-muted hover:bg-surface hover:text-fg">+ Add slide</button>

        <Label>Handle</Label>
        <Input value={handle} onChange={setHandle} />
      </aside>
    </div>
  );
}

/** One option in the variant picker: its cover slide, at a glance. */
function VariantCard({
  label,
  slide,
  design,
  handle,
  size,
  onPick,
  cta,
}: {
  label: string;
  slide?: CarouselSlide;
  design: ReturnType<typeof getDesign>;
  handle: string;
  size: SlideSize;
  onPick: () => void;
  cta?: string;
}) {
  const s = 0.15;
  const d = slideDims(size);
  if (!slide) return null;
  return (
    <button onClick={onPick} className="group text-left">
      <div
        className="overflow-hidden rounded-control ring-1 ring-line transition group-hover:ring-2 group-hover:ring-accent"
        style={{ width: d.w * s, height: d.h * s }}
      >
        <div style={{ width: d.w, height: d.h, transform: `scale(${s})`, transformOrigin: "top left" }}>
          <SlideCanvas slide={slide} design={design} index={0} total={1} handle={handle} size={size} />
        </div>
      </div>
      <p className="mt-1.5 truncate text-xs font-medium capitalize text-fg">{label}</p>
      {cta && <p className="truncate text-xs text-muted group-hover:text-accent">{cta}</p>}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mt-4 block text-xs font-medium text-muted">{children}</label>;
}
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-control border border-line bg-ink px-3 py-2 text-base outline-none focus:border-accent sm:text-sm" />;
}
function Area({ value, onChange, rows }: { value: string; onChange: (v: string) => void; rows: number }) {
  return <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full resize-none rounded-control border border-line bg-ink px-3 py-2 text-base outline-none focus:border-accent sm:text-sm" />;
}
function ModuleEdit({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 rounded-control border border-line bg-ink/40 p-3">{children}</div>;
}
