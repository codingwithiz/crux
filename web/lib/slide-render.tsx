import type { CarouselTheme, Slide, SlideKind, SlideLayout } from "./types";

/** Default layout when a slide doesn't specify one (keeps old carousels working). */
export function defaultLayout(kind: SlideKind): SlideLayout {
  if (kind === "counter" || kind === "conventional") return "split";
  return "statement";
}

function bigTitleSize(len: number): number {
  if (len < 28) return 108;
  if (len < 55) return 88;
  if (len < 95) return 70;
  if (len < 150) return 56;
  return 46;
}
function headingSize(len: number): number {
  if (len < 40) return 64;
  if (len < 90) return 54;
  return 44;
}

/**
 * One 1080x1350 carousel slide — a bold/punchy template gallery. A shared frame
 * (gradient bg, kicker chip, page counter, footer + progress bar) wraps a body
 * that varies by `layout` (statement / stat / quote / list / split). Strictly
 * within Satori's flexbox-only subset so the SAME component renders identically
 * in the browser preview and as a server PNG (next/og). No grid, no box-shadow.
 */
export function SlideArt({
  slide,
  theme,
  index,
  total,
  handle,
}: {
  slide: Slide;
  theme: CarouselTheme;
  index: number;
  total: number;
  handle: string;
}) {
  const layout = slide.layout ?? defaultLayout(slide.kind);
  const isHook = slide.kind === "hook";
  const isCta = slide.kind === "cta";
  const isLast = index >= total - 1;
  const bg2 = theme.bg2 ?? theme.bg;
  const pct = total > 1 ? Math.round(((index + 1) / total) * 100) : 100;
  const num = String(index + 1).padStart(2, "0");
  const chipFilled = isHook || isCta;
  const kicker =
    isCta && (!slide.kicker.trim() || slide.kicker.trim() === "—") ? "WRAP-UP" : slide.kicker;

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 88,
        backgroundColor: theme.bg,
        backgroundImage: `linear-gradient(145deg, ${theme.bg} 0%, ${bg2} 100%)`,
        color: theme.fg,
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {layout === "stat" || (!isHook && !isCta && layout === "statement") ? (
        <div
          style={{
            position: "absolute",
            top: -40,
            right: 30,
            display: "flex",
            fontSize: 320,
            fontWeight: 800,
            letterSpacing: -10,
            color: theme.accent,
            opacity: 0.06,
          }}
        >
          {num}
        </div>
      ) : null}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 24,
            paddingRight: 24,
            borderRadius: 999,
            border: `3px solid ${theme.accent}`,
            backgroundColor: chipFilled ? theme.accent : "transparent",
            color: chipFilled ? theme.accentFg : theme.accent,
            fontSize: 25,
            letterSpacing: 3,
            fontWeight: 800,
          }}
        >
          {kicker}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: theme.muted, letterSpacing: 3, fontWeight: 700 }}>
          {num} / {String(total).padStart(2, "0")}
        </div>
      </div>

      {/* Body (per layout) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          alignItems: isCta ? "center" : "stretch",
          paddingTop: 36,
          paddingBottom: 36,
        }}
      >
        <Body slide={slide} layout={layout} theme={theme} isHook={isHook} isCta={isCta} />
      </div>

      {/* Footer */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", height: 3, backgroundColor: theme.accent, opacity: 0.5, width: 120 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22 }}>
          <div style={{ display: "flex", fontSize: 27, color: theme.fg, fontWeight: 800 }}>{handle}</div>
          {isLast || isCta ? (
            <div
              style={{
                display: "flex",
                paddingTop: 11,
                paddingBottom: 11,
                paddingLeft: 26,
                paddingRight: 26,
                borderRadius: 999,
                backgroundColor: theme.accent,
                color: theme.accentFg,
                fontSize: 25,
                fontWeight: 800,
              }}
            >
              Follow for more →
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 25, color: theme.muted, fontWeight: 700, letterSpacing: 1 }}>
              swipe →
            </div>
          )}
        </div>
        <div style={{ display: "flex", position: "relative", height: 9, marginTop: 20, borderRadius: 999, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 904, height: 9, backgroundColor: theme.muted, opacity: 0.22 }} />
          <div style={{ position: "absolute", top: 0, left: 0, width: `${pct}%`, height: 9, backgroundColor: theme.accent }} />
        </div>
      </div>
    </div>
  );
}

function Body({
  slide,
  layout,
  theme,
  isHook,
  isCta,
}: {
  slide: Slide;
  layout: SlideLayout;
  theme: CarouselTheme;
  isHook: boolean;
  isCta: boolean;
}) {
  // --- STAT: a huge number + label ---
  if (layout === "stat" && slide.stat) {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {slide.title ? (
          <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: theme.muted, marginBottom: 8 }}>
            {slide.title}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 230, fontWeight: 800, lineHeight: 0.9, letterSpacing: -8, color: theme.accent }}>
            {slide.stat.value}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, marginTop: 6 }}>{slide.stat.label}</div>
        {slide.body ? (
          <div style={{ display: "flex", fontSize: 32, color: theme.fg, lineHeight: 1.4, marginTop: 28 }}>
            {slide.body}
          </div>
        ) : null}
      </div>
    );
  }

  // --- QUOTE: oversized pull-quote ---
  if (layout === "quote") {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 170, lineHeight: 0.7, fontWeight: 800, color: theme.accent }}>&ldquo;</div>
        <div style={{ display: "flex", fontSize: bigTitleSize((slide.title || slide.body).length), fontWeight: 800, lineHeight: 1.1, letterSpacing: -1, marginTop: 8 }}>
          {slide.title || slide.body}
        </div>
        {slide.title && slide.body ? (
          <div style={{ display: "flex", fontSize: 32, color: theme.muted, marginTop: 26, fontWeight: 600 }}>
            {slide.body}
          </div>
        ) : null}
      </div>
    );
  }

  // --- LIST: heading + punchy bullets ---
  if (layout === "list") {
    const items =
      slide.bullets && slide.bullets.filter(Boolean).length
        ? slide.bullets.filter((b) => b.trim())
        : (slide.body || "").split(/\n|(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {slide.title ? (
          <div style={{ display: "flex", fontSize: headingSize(slide.title.length), fontWeight: 800, lineHeight: 1.08, letterSpacing: -1, marginBottom: 30 }}>
            {slide.title}
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", marginTop: i === 0 ? 0 : 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: theme.accent,
                  color: theme.accentFg,
                  fontSize: 24,
                  fontWeight: 800,
                  marginRight: 22,
                }}
              >
                {i + 1}
              </div>
              <div style={{ display: "flex", flex: 1, fontSize: 34, lineHeight: 1.32, color: theme.fg, paddingTop: 2 }}>
                {it}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- SPLIT: framed heading + divider + body (e.g. consensus vs. my take) ---
  if (layout === "split") {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {slide.title ? (
          <div style={{ display: "flex", fontSize: headingSize(slide.title.length), fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>
            {slide.title}
          </div>
        ) : null}
        <div style={{ display: "flex", height: 6, width: 160, backgroundColor: theme.accent, marginTop: 28, marginBottom: 28, borderRadius: 999 }} />
        {slide.body ? (
          <div style={{ display: "flex", fontSize: 36, lineHeight: 1.4, color: theme.fg }}>{slide.body}</div>
        ) : null}
      </div>
    );
  }

  // --- STATEMENT (default): bold accent bar + big claim + body ---
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isCta ? "center" : "stretch" }}>
      {!isCta ? (
        <div style={{ display: "flex", height: 12, width: 96, backgroundColor: theme.accent, borderRadius: 999, marginBottom: 30 }} />
      ) : null}
      {slide.title ? (
        <div
          style={{
            display: "flex",
            fontSize: bigTitleSize(slide.title.length),
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            textAlign: isCta ? "center" : "left",
          }}
        >
          {slide.title}
        </div>
      ) : null}
      {slide.body ? (
        <div
          style={{
            display: "flex",
            fontSize: isCta ? 40 : 34,
            color: isHook || isCta ? theme.muted : theme.fg,
            lineHeight: 1.42,
            marginTop: slide.title ? 28 : 0,
            fontWeight: isCta ? 700 : 400,
            textAlign: isCta ? "center" : "left",
          }}
        >
          {slide.body}
        </div>
      ) : null}
    </div>
  );
}
