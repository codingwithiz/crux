"use client";

/**
 * /lab — dev preview of the new HTML/CSS carousel engine. Top: the @itsnextwork
 * reference slides. Bottom: the SAME hero template rendered for different
 * brands, proving per-topic dynamic theming (official logo + brand color world)
 * on one cohesive editorial system.
 */
import { useRef, useState } from "react";
import { SlideCanvas } from "@/components/carousel/SlideCanvas";
import { getDesign, type CarouselSlide } from "@/lib/carousel/design";
import { applyBrand, BRANDS } from "@/lib/carousel/brand";
import { slideToBlob, downloadBlob } from "@/lib/carousel/export";

const SLIDES: CarouselSlide[] = [
  {
    layout: "hero",
    brand: { name: "redis", slug: "redis" },
    headline: "How does Redis work?",
    module: {
      type: "statBars",
      rows: [
        { label: "from disk", value: "~10 ms", pct: 100, tone: "neutral" },
        { label: "from memory", value: "~0.1 ms", pct: 8, tone: "bad" },
      ],
    },
  },
  {
    layout: "explainer",
    brand: { name: "redis", slug: "redis" },
    headline: "Why is a database slow?",
    highlight: "slow",
    highlightTone: "yellow",
    body: "A normal database keeps your data on disk. Every read waits on a disk lookup, parses a query, and takes a lock. Each step costs milliseconds. Redis removes them one by one.",
    module: {
      type: "statBars",
      caption: "What one read actually costs",
      rows: [
        { label: "Disk database", value: "~5 ms", pct: 100, tone: "bad", segments: ["disk lookup", "query parse", "lock wait"] },
        { label: "Redis", value: "~0.1 ms", pct: 10, tone: "good" },
      ],
      note: { title: "Redis skips all three", body: "it lives in memory, so reads finish in microseconds", tone: "good" },
    },
  },
  {
    layout: "explainer",
    brand: { name: "redis", slug: "redis" },
    headline: "What is Redis?",
    highlight: "Redis",
    highlightTone: "pink",
    body: "Redis is an in-memory key-value store. Every piece of data lives in RAM and is reached straight by its key, so there is no table to scan and no disk to wait on.",
    module: {
      type: "keyValue",
      heading: "in memory (RAM)",
      rows: [
        { key: "user:42", value: "{ name: Max }", pill: "instant" },
        { key: "cart:42", value: "[ 3 items ]" },
        { key: "session:ab9", value: "logged in" },
      ],
      caption: "Ask for a key, get the value in one hop. No table to scan.",
    },
  },
  {
    layout: "hero",
    headline: "How Discord's system design stored trillions",
    underline: "system design",
    highlight: "trillions",
    highlightTone: "yellow",
    doodles: true,
    arrow: true,
  },
];

// Same hero template, different topic → different official logo + color world.
const VARIANT_SLUGS = ["redis", "discord", "postgresql", "stripe", "supabase", "vercel"];
function variantSlide(slug: string): CarouselSlide {
  const name = BRANDS[slug].name;
  return {
    layout: "hero",
    brand: { name, slug },
    headline: `How ${name} works`,
    module: { type: "callout", tone: "neutral", title: `${name} in one line`, body: "Same editorial system — the accent + logo are themed to the topic." },
  };
}

// One slide per visualization module — validates the whole chart/diagram library.
const VIZ: CarouselSlide[] = [
  { layout: "explainer", brand: { name: "NVIDIA", slug: "nvidia" }, kicker: "Bar chart", headline: "Training compute keeps climbing", module: { type: "barChart", caption: "Relative compute per year", bars: [{ label: "2023", value: 40, display: "40" }, { label: "2024", value: 70, display: "70" }, { label: "2025", value: 100, display: "100", tone: "good" }] } },
  { layout: "explainer", brand: { name: "OpenAI", slug: "openai" }, kicker: "Trend", headline: "Inference cost is falling fast", module: { type: "lineChart", caption: "$ per million tokens", labels: ["'23", "'24", "'25", "'26"], series: [{ points: [100, 55, 22, 8] }] } },
  { layout: "explainer", brand: { name: "Vercel", slug: "vercel" }, kicker: "Proportion", headline: "How much is actually new?", module: { type: "donut", value: 35, label: "of 'AI launches' ship a genuinely new capability — the rest is repackaging.", tone: "brand" } },
  { layout: "explainer", brand: { name: "Kubernetes", slug: "kubernetes" }, kicker: "How it works", headline: "From commit to prod", module: { type: "timeline", steps: [{ label: "Commit", sub: "git push" }, { label: "Build", sub: "CI" }, { label: "Stage", sub: "preview" }, { label: "Ship", sub: "prod" }] } },
  { layout: "explainer", brand: { name: "PostgreSQL", slug: "postgresql" }, kicker: "Versus", headline: "The consensus vs. my take", module: { type: "comparison", left: { title: "Consensus", items: ["More scale wins", "Bigger = better", "Data is commoditized"] }, right: { title: "My take", items: ["Efficiency wins now", "Training quality > size", "Curated data is the moat"] } } },
];

const DESIGN_IDS = ["paper", "product", "magazine", "pastel", "brutalist", "dusk", "ink", "slate", "blueprint", "terminal", "mesh", "neon"];

export default function LabPage() {
  const [designId, setDesignId] = useState("paper");
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const base = getDesign(designId);
  const scale = 0.42;

  async function exportOne(i: number) {
    const node = refs.current[i];
    if (!node) return;
    downloadBlob(await slideToBlob(node), `slide-${String(i + 1).padStart(2, "0")}.png`);
  }

  function Card({ slide, i, design }: { slide: CarouselSlide; i: number; design: ReturnType<typeof getDesign> }) {
    return (
      <div className="flex flex-col gap-2">
        <div style={{ width: 1080 * scale, height: 1350 * scale, overflow: "hidden", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
          <div style={{ width: 1080, height: 1350, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <SlideCanvas
              slide={slide}
              design={design}
              index={i}
              total={5}
              handle="@itsnextwork"
              innerRef={(el) => { refs.current[i] = el; }}
            />
          </div>
        </div>
        <button onClick={() => void exportOne(i)} className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface">
          Export PNG
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-2xl font-bold">Carousel engine lab</h1>
      <p className="mt-1 text-sm text-muted">HTML/CSS SlideCanvas · client export · @itsnextwork aesthetic.</p>

      <div className="mt-4 flex gap-2">
        {DESIGN_IDS.map((id) => (
          <button
            key={id}
            onClick={() => setDesignId(id)}
            className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${designId === id ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"}`}
          >
            {id}
          </button>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Reference slides</h2>
      <div className="mt-3 flex flex-wrap gap-8">
        {SLIDES.map((slide, i) => (
          <div key={i} className="contents">{Card({ slide, i, design: applyBrand(base, slide.brand) })}</div>
        ))}
      </div>

      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-muted">
        Same template · dynamic per-topic theme + official logo
      </h2>
      <div className="mt-3 flex flex-wrap gap-8">
        {VARIANT_SLUGS.map((slug, k) => {
          const slide = variantSlide(slug);
          return <div key={slug} className="contents">{Card({ slide, i: 100 + k, design: applyBrand(base, slide.brand) })}</div>;
        })}
      </div>

      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-muted">Visualization library</h2>
      <div className="mt-3 flex flex-wrap gap-8">
        {VIZ.map((slide, k) => (
          <div key={`viz${k}`} className="contents">{Card({ slide, i: 200 + k, design: applyBrand(base, slide.brand) })}</div>
        ))}
      </div>
    </div>
  );
}
