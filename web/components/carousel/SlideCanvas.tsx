/**
 * SlideCanvas — one 1080×1350 carousel slide rendered as REAL HTML/CSS (no
 * Satori), so the live preview is pixel-identical to the exported PNG (via
 * modern-screenshot). This is the editorial @itsnextwork-style engine: serif
 * headlines, marker highlights + squiggle underlines, semantic data modules,
 * brand logos, corner doodles.
 */
import type { CSSProperties, ReactNode, Ref } from "react";
import type { CarouselDesign, CarouselSlide, ChartTone, SlideModule, StatBarRow } from "@/lib/carousel/design";
import { DoodleEye, DoodleGhost, GrainOverlay, HandArrow, Squiggle } from "./decor";
import { BrandMark, BRAND_LOGOS } from "@/lib/carousel/logos";

const SERIF = "var(--font-newsreader), Georgia, serif";
const SANS = "var(--font-geist-sans), system-ui, sans-serif";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

const W = 1080;
const H = 1350;
const PAD = 96;

function trackBg(d: CarouselDesign) {
  return d.mode === "light" ? "rgba(27,23,20,0.08)" : "rgba(255,255,255,0.09)";
}
function toneColor(d: CarouselDesign, tone?: "good" | "bad" | "neutral") {
  if (tone === "good") return d.good;
  if (tone === "bad") return d.bad;
  return d.muted;
}
function chartColor(d: CarouselDesign, tone?: ChartTone) {
  if (tone === "good") return d.good;
  if (tone === "bad") return d.bad;
  if (tone === "neutral") return d.muted;
  return d.accent; // "brand" (default) rides the per-topic accent
}

/** Wrap a phrase in a marker highlight (multiline-safe). */
function Marker({ children, design, tone }: { children: ReactNode; design: CarouselDesign; tone?: "yellow" | "pink" }) {
  return (
    <span
      style={{
        backgroundColor: tone === "pink" ? design.markerPink : design.markerYellow,
        color: "#1b1714", // keep highlighted text dark on the light marker swatch in every theme
        padding: "0.02em 0.12em",
        borderRadius: 4,
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {children}
    </span>
  );
}

/** Wrap a phrase with a hand-drawn squiggle underline. */
function Underlined({ children, design }: { children: ReactNode; design: CarouselDesign }) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <Squiggle color={design.accent} />
    </span>
  );
}

/** Split the headline and apply marker-highlight + squiggle to matching phrases. */
function decorateHeadline(slide: CarouselSlide, design: CarouselDesign): ReactNode {
  const text = slide.headline;
  const marks: { start: number; end: number; kind: "hl" | "ul" }[] = [];
  if (slide.highlight) {
    const i = text.indexOf(slide.highlight);
    if (i >= 0) marks.push({ start: i, end: i + slide.highlight.length, kind: "hl" });
  }
  if (slide.underline) {
    const i = text.indexOf(slide.underline);
    if (i >= 0) marks.push({ start: i, end: i + slide.underline.length, kind: "ul" });
  }
  marks.sort((a, b) => a.start - b.start);
  const clean: typeof marks = [];
  let last = 0;
  for (const m of marks) if (m.start >= last) { clean.push(m); last = m.end; }
  if (!clean.length) return text;

  const out: ReactNode[] = [];
  let cur = 0;
  clean.forEach((m, i) => {
    if (m.start > cur) out.push(<span key={`t${i}`}>{text.slice(cur, m.start)}</span>);
    const seg = text.slice(m.start, m.end);
    out.push(
      m.kind === "hl" ? (
        <Marker key={`m${i}`} design={design} tone={slide.highlightTone}>{seg}</Marker>
      ) : (
        <Underlined key={`u${i}`} design={design}>{seg}</Underlined>
      ),
    );
    cur = m.end;
  });
  if (cur < text.length) out.push(<span key="tail">{text.slice(cur)}</span>);
  return out;
}

function headlineSize(len: number, layout: string): number {
  if (layout === "hero" || layout === "statement") return len < 22 ? 130 : len < 40 ? 104 : len < 70 ? 82 : 64;
  if (layout === "cta") return len < 30 ? 100 : len < 60 ? 78 : 60;
  return len < 28 ? 84 : len < 60 ? 68 : 56; // explainer
}

// ─── Modules ────────────────────────────────────────────────────────────────

function StatBars({ mod, design }: { mod: Extract<SlideModule, { type: "statBars" }>; design: CarouselDesign }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {mod.caption && (
        <div style={{ fontFamily: SANS, fontSize: 24, color: design.muted, fontWeight: 600 }}>{mod.caption}</div>
      )}
      {mod.rows.map((row: StatBarRow, i) => {
        const c = toneColor(design, row.tone);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 200, fontFamily: SANS, fontSize: 27, fontWeight: 700, color: row.tone === "good" ? design.good : design.fg }}>
              {row.label}
            </div>
            <div style={{ flex: 1, height: 56, background: trackBg(design), borderRadius: 12, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${Math.max(row.pct, 4)}%`, height: "100%", background: row.segments?.length ? "transparent" : c, borderRadius: 12, display: "flex" }}>
                {row.segments?.map((s, j) => (
                  <div
                    key={j}
                    style={{
                      flex: 1,
                      height: "100%",
                      background: c,
                      opacity: 1 - j * 0.18,
                      borderRight: j < row.segments!.length - 1 ? "2px solid rgba(255,255,255,0.55)" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontFamily: SANS,
                      fontSize: 20,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      padding: "0 8px",
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: 130, textAlign: "right", fontFamily: MONO, fontSize: 30, fontWeight: 600, color: c }}>{row.value}</div>
          </div>
        );
      })}
      {mod.note && (
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 6 }}>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 26,
              fontWeight: 700,
              color: mod.note.tone === "bad" ? design.bad : design.good,
              border: `2px solid ${mod.note.tone === "bad" ? design.bad : design.good}`,
              background: mod.note.tone === "bad" ? design.badSoft : design.goodSoft,
              borderRadius: 16,
              padding: "16px 22px",
              maxWidth: 360,
            }}
          >
            {mod.note.title}
          </div>
          {mod.note.body && <div style={{ flex: 1, fontFamily: SANS, fontSize: 25, color: design.muted, lineHeight: 1.4 }}>{mod.note.body}</div>}
        </div>
      )}
    </div>
  );
}

function KeyValue({ mod, design }: { mod: Extract<SlideModule, { type: "keyValue" }>; design: CarouselDesign }) {
  return (
    <div
      style={{
        border: `2px solid ${design.accent}33`,
        background: design.mode === "light" ? "#fff" : design.card,
        borderRadius: 24,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {(mod.heading || true) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: SANS, fontSize: 23, fontWeight: 700, color: design.accent }}>{mod.heading ?? "in memory"}</div>
          <div style={{ fontFamily: MONO, fontSize: 22, color: design.muted }}>key → value</div>
        </div>
      )}
      {mod.rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 27,
              fontWeight: 600,
              color: design.fg,
              border: `1.5px solid ${design.cardBorder}`,
              background: design.mode === "light" ? "#faf8f3" : "rgba(255,255,255,0.04)",
              borderRadius: 12,
              padding: "12px 20px",
              minWidth: 230,
            }}
          >
            {r.key}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 28, color: design.muted }}>→</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 26, color: design.fg }}>
            <span>{r.value}</span>
            {r.pill && (
              <span style={{ fontFamily: SANS, fontSize: 21, fontWeight: 700, color: "#fff", background: design.good, borderRadius: 999, padding: "5px 16px" }}>
                {r.pill}
              </span>
            )}
          </div>
        </div>
      ))}
      {mod.caption && <div style={{ fontFamily: SANS, fontSize: 24, color: design.muted, marginTop: 4 }}>{mod.caption}</div>}
    </div>
  );
}

function IconFlow({ mod, design }: { mod: Extract<SlideModule, { type: "iconFlow" }>; design: CarouselDesign }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
      {mod.steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 150 }}>
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: 24,
                background: design.mode === "light" ? "#fff" : design.card,
                border: `1.5px solid ${design.cardBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: design.mode === "light" ? "0 10px 30px rgba(27,23,20,0.10)" : "none",
              }}
            >
              {s.slug && BRAND_LOGOS[s.slug.toLowerCase()] ? <BrandMark slug={s.slug} size={56} /> : <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 700, color: design.accent }}>{i + 1}</div>}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 600, color: design.fg, textAlign: "center" }}>{s.label}</div>
          </div>
          {i < mod.steps.length - 1 && <div style={{ fontFamily: SANS, fontSize: 34, color: design.muted }}>→</div>}
        </div>
      ))}
    </div>
  );
}

function Callout({ mod, design }: { mod: Extract<SlideModule, { type: "callout" }>; design: CarouselDesign }) {
  const c = mod.tone === "bad" ? design.bad : mod.tone === "good" ? design.good : design.accent;
  const soft = mod.tone === "bad" ? design.badSoft : mod.tone === "good" ? design.goodSoft : `${design.accent}1a`;
  return (
    <div style={{ border: `2px solid ${c}`, background: soft, borderRadius: 20, padding: "28px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontFamily: SANS, fontSize: 32, fontWeight: 800, color: c }}>{mod.title}</div>
      {mod.body && <div style={{ fontFamily: SANS, fontSize: 27, color: design.fg, lineHeight: 1.4 }}>{mod.body}</div>}
    </div>
  );
}

function BigStat({ mod, design }: { mod: Extract<SlideModule, { type: "bigStat" }>; design: CarouselDesign }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontFamily: SERIF, fontSize: 220, lineHeight: 0.9, fontWeight: 600, color: design.accent, letterSpacing: -6 }}>{mod.value}</div>
      <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 700, color: design.fg, marginTop: 8 }}>{mod.label}</div>
    </div>
  );
}

function BarChart({ mod, design }: { mod: Extract<SlideModule, { type: "barChart" }>; design: CarouselDesign }) {
  const max = mod.max ?? Math.max(...mod.bars.map((b) => b.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {mod.caption && <div style={{ fontFamily: SANS, fontSize: 24, color: design.muted, fontWeight: 600 }}>{mod.caption}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 26, height: 320, borderBottom: `2px solid ${design.cardBorder}` }}>
        {mod.bars.map((b, i) => {
          const c = chartColor(design, b.tone);
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: c, marginBottom: 10 }}>{b.display ?? b.value}</div>
              <div style={{ width: "64%", height: Math.max((b.value / max) * 250, 6), background: c, borderRadius: "12px 12px 0 0" }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 26 }}>
        {mod.bars.map((b, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontFamily: SANS, fontSize: 23, fontWeight: 600, color: design.fg }}>{b.label}</div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ mod, design }: { mod: Extract<SlideModule, { type: "lineChart" }>; design: CarouselDesign }) {
  const all = mod.series.flatMap((s) => s.points);
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const VW = 880, VH = 300, pad = 14;
  const x = (i: number, n: number) => pad + (n <= 1 ? 0 : (i / (n - 1)) * (VW - 2 * pad));
  const y = (v: number) => VH - pad - ((v - min) / (max - min || 1)) * (VH - 2 * pad);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {mod.caption && <div style={{ fontFamily: SANS, fontSize: 24, color: design.muted, fontWeight: 600 }}>{mod.caption}</div>}
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto" }}>
        <line x1={0} y1={VH - pad} x2={VW} y2={VH - pad} stroke={design.cardBorder} strokeWidth={2} />
        {mod.series.map((s, si) => {
          const c = chartColor(design, s.tone);
          const n = s.points.length;
          const pts = s.points.map((v, i) => `${x(i, n)},${y(v)}`).join(" ");
          const area = `${x(0, n)},${VH - pad} ${pts} ${x(n - 1, n)},${VH - pad}`;
          return (
            <g key={si}>
              {si === 0 && <polygon points={area} fill={c} opacity={0.12} />}
              <polyline points={pts} fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={x(n - 1, n)} cy={y(s.points[n - 1])} r={9} fill={c} />
            </g>
          );
        })}
      </svg>
      {mod.labels && (
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 22, color: design.muted }}>
          {mod.labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  );
}

function Donut({ mod, design }: { mod: Extract<SlideModule, { type: "donut" }>; design: CarouselDesign }) {
  const c = chartColor(design, mod.tone);
  const r = 118, sw = 32, C = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, mod.value)) / 100) * C;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
      <div style={{ position: "relative", width: 300, height: 300, flexShrink: 0 }}>
        <svg width={300} height={300} viewBox="0 0 300 300">
          <circle cx={150} cy={150} r={r} fill="none" stroke={trackBg(design)} strokeWidth={sw} />
          <circle cx={150} cy={150} r={r} fill="none" stroke={c} strokeWidth={sw} strokeDasharray={`${dash} ${C}`} strokeLinecap="round" transform="rotate(-90 150 150)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 78, fontWeight: 600, color: design.fg }}>
          {mod.value}%
        </div>
      </div>
      <div style={{ flex: 1, fontFamily: SANS, fontSize: 34, fontWeight: 700, color: design.fg, lineHeight: 1.3 }}>{mod.label}</div>
    </div>
  );
}

function Timeline({ mod, design }: { mod: Extract<SlideModule, { type: "timeline" }>; design: CarouselDesign }) {
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ position: "absolute", top: 19, left: 40, right: 40, height: 3, background: design.cardBorder }} />
      {mod.steps.map((s, i) => (
        <div key={i} style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "0 8px" }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: design.accent, color: design.accentFg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 800, fontSize: 21 }}>{i + 1}</div>
          <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 700, color: design.fg, textAlign: "center" }}>{s.label}</div>
          {s.sub && <div style={{ fontFamily: SANS, fontSize: 22, color: design.muted, textAlign: "center" }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function CompareCol({ data, color, fg }: { data: { title: string; items: string[] }; color: string; fg: string }) {
  return (
    <div style={{ flex: 1, border: `2px solid ${color}`, background: `${color}14`, borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 800, color }}>{data.title}</div>
      {data.items.map((it, i) => (
        <div key={i} style={{ fontFamily: SANS, fontSize: 25, color: fg, lineHeight: 1.35 }}>{it}</div>
      ))}
    </div>
  );
}

function Comparison({ mod, design }: { mod: Extract<SlideModule, { type: "comparison" }>; design: CarouselDesign }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 24 }}>
      <CompareCol data={mod.left} color={design.muted} fg={design.fg} />
      <CompareCol data={mod.right} color={design.accent} fg={design.fg} />
    </div>
  );
}

function Module({ mod, design }: { mod: SlideModule; design: CarouselDesign }) {
  switch (mod.type) {
    case "statBars": return <StatBars mod={mod} design={design} />;
    case "barChart": return <BarChart mod={mod} design={design} />;
    case "lineChart": return <LineChart mod={mod} design={design} />;
    case "donut": return <Donut mod={mod} design={design} />;
    case "bigStat": return <BigStat mod={mod} design={design} />;
    case "timeline": return <Timeline mod={mod} design={design} />;
    case "iconFlow": return <IconFlow mod={mod} design={design} />;
    case "comparison": return <Comparison mod={mod} design={design} />;
    case "keyValue": return <KeyValue mod={mod} design={design} />;
    case "callout": return <Callout mod={mod} design={design} />;
  }
}

// ─── The slide ────────────────────────────────────────────────────────────

export function SlideCanvas({
  slide,
  design,
  index,
  total,
  handle,
  innerRef,
  style,
}: {
  slide: CarouselSlide;
  design: CarouselDesign;
  index: number;
  total: number;
  handle: string;
  innerRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
}) {
  const layout = slide.layout ?? "explainer";
  const isHero = layout === "hero";
  const isStatement = layout === "statement";
  const isCta = layout === "cta";
  const centered = isHero || isStatement || isCta;
  const showModule = (isHero || layout === "explainer") && !!slide.module;
  const hSize = headlineSize(slide.headline.length, layout);
  const headFont = design.headingFont === "sans" ? SANS : design.headingFont === "mono" ? MONO : SERIF;

  return (
    <div
      ref={innerRef}
      style={{
        width: W,
        height: H,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(160deg, ${design.bg2} 0%, ${design.bg} 70%)`,
        color: design.fg,
        padding: PAD,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <GrainOverlay strength={design.grain} mode={design.mode} />

      {/* Corner doodles (hero) */}
      {slide.doodles && (
        <>
          <div style={{ position: "absolute", top: 64, left: 72, opacity: 0.9 }}>
            <DoodleEye color={design.accent} />
          </div>
          <div style={{ position: "absolute", top: 60, right: 80, opacity: 0.9 }}>
            <DoodleGhost color={design.mode === "light" ? "#7c93ff" : design.accent} />
          </div>
        </>
      )}

      {/* HEADER zone — brand lockup (only when a brand is set) or kicker label */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: centered ? "center" : "flex-start", minHeight: 60 }}>
        {slide.brand ? (
          <div style={{ display: "flex", alignItems: "center", gap: isHero ? 20 : 14 }}>
            {slide.brand.slug && <BrandMark slug={slide.brand.slug} size={isHero ? 72 : 48} />}
            <div style={{ fontFamily: SANS, fontSize: isHero ? 52 : 36, fontWeight: 700, letterSpacing: -0.5, color: design.muted }}>{slide.brand.name}</div>
          </div>
        ) : slide.kicker ? (
          <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: design.accent }}>{slide.kicker}</div>
        ) : null}
      </div>

      {/* MIDDLE zone — layout-distinct: hero/statement/cta center; explainer left.
          statement = bold claim + accent rule, no module; cta = end-card w/ follow. */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: centered ? "center" : "flex-start", alignItems: centered ? "center" : "stretch", paddingTop: centered ? 0 : 28, paddingBottom: 20, textAlign: centered ? "center" : "left" }}>
        {isStatement && <div style={{ width: 90, height: 10, borderRadius: 999, background: design.accent, marginBottom: 32 }} />}
        <div style={{ fontFamily: headFont, fontSize: hSize, lineHeight: headFont === MONO ? 1.1 : 1.04, letterSpacing: headFont === MONO ? -2 : -1, fontWeight: headFont === SERIF ? 600 : 800 }}>
          {decorateHeadline(slide, design)}
        </div>

        {slide.arrow && (
          <div style={{ display: "flex", justifyContent: centered ? "center" : "flex-start", marginTop: 36 }}>
            <HandArrow color={design.fg} size={150} />
          </div>
        )}

        {slide.body && (
          <div style={{ fontFamily: SANS, fontSize: isStatement ? 38 : 33, lineHeight: 1.45, color: isStatement ? design.muted : design.fg, marginTop: 26, maxWidth: 900 }}>
            {slide.body}
          </div>
        )}

        {showModule && (
          <div style={{ marginTop: 40, width: "100%", textAlign: "left" }}>
            <Module mod={slide.module!} design={design} />
          </div>
        )}

        {isCta && (
          <div style={{ marginTop: 40, fontFamily: SANS, fontSize: 30, fontWeight: 800, color: design.accentFg, background: design.accent, borderRadius: 999, padding: "16px 34px" }}>
            Follow for more →
          </div>
        )}
      </div>

      {/* FOOTER zone */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 700, color: design.muted }}>{handle}</div>
        <div style={{ display: "flex", gap: 9 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ width: i === index ? 26 : 9, height: 9, borderRadius: 999, background: i === index ? design.accent : design.muted, opacity: i === index ? 1 : 0.4 }} />
          ))}
        </div>
        <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, color: design.muted, letterSpacing: 1 }}>
          {index >= total - 1 ? "follow →" : "swipe →"}
        </div>
      </div>
    </div>
  );
}
