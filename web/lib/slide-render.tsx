import type { CarouselTheme, Slide } from "./types";

function titleSize(len: number, isHook: boolean): number {
  if (isHook) {
    if (len < 40) return 94;
    if (len < 90) return 76;
    if (len < 150) return 60;
    return 50;
  }
  if (len < 60) return 60;
  if (len < 120) return 52;
  if (len < 200) return 44;
  return 38;
}

/**
 * One 1080x1350 carousel slide. Flexbox-only inline styles so the SAME
 * component renders identically in the browser preview and in Satori
 * (next/og ImageResponse). Everything here stays inside Satori's supported
 * subset: flex layout, linear-gradient backgrounds, absolute positioning,
 * opacity, border/borderRadius. No grid, no box-shadow, no unsupported props.
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
  const isHook = slide.kind === "hook";
  const isCta = slide.kind === "cta";
  const isLast = index >= total - 1;
  const bg2 = theme.bg2 ?? theme.bg;
  const pct = total > 1 ? Math.round(((index + 1) / total) * 100) : 100;
  const num = String(index + 1).padStart(2, "0");

  // Hook & CTA get a filled accent kicker chip; the rest get an outline chip.
  const chipFilled = isHook || isCta;
  // A bare "—"/empty kicker on the closing slide reads as a placeholder.
  const kicker = isCta && (!slide.kicker.trim() || slide.kicker.trim() === "—") ? "WRAP-UP" : slide.kicker;

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 92,
        backgroundColor: theme.bg,
        backgroundImage: `linear-gradient(145deg, ${theme.bg} 0%, ${bg2} 100%)`,
        color: theme.fg,
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Faded watermark — big slide numeral for context slides (depth). */}
      {!isHook && !isCta ? (
        <div
          style={{
            position: "absolute",
            top: -30,
            right: 36,
            display: "flex",
            fontSize: 300,
            fontWeight: 800,
            letterSpacing: -8,
            color: theme.accent,
            opacity: 0.07,
          }}
        >
          {num}
        </div>
      ) : null}

      {/* Header: kicker chip + page counter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            paddingTop: 9,
            paddingBottom: 9,
            paddingLeft: 22,
            paddingRight: 22,
            borderRadius: 999,
            border: `2px solid ${theme.accent}`,
            backgroundColor: chipFilled ? theme.accent : "transparent",
            color: chipFilled ? theme.accentFg : theme.accent,
            fontSize: 24,
            letterSpacing: 3,
            fontWeight: 700,
          }}
        >
          {kicker}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: theme.muted, letterSpacing: 3, fontWeight: 600 }}>
          {num} / {String(total).padStart(2, "0")}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          alignItems: isCta ? "center" : "stretch",
          paddingTop: 40,
          paddingBottom: 40,
        }}
      >
        {isHook ? (
          <div style={{ display: "flex", fontSize: 150, lineHeight: 1, fontWeight: 800, color: theme.accent, marginBottom: 4 }}>
            &ldquo;
          </div>
        ) : null}
        {slide.title ? (
          <div
            style={{
              display: "flex",
              fontSize: titleSize(slide.title.length, isHook),
              fontWeight: 800,
              lineHeight: 1.07,
              letterSpacing: -1,
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
              lineHeight: 1.45,
              marginTop: slide.title ? 28 : 0,
              fontWeight: isCta ? 600 : 400,
              textAlign: isCta ? "center" : "left",
            }}
          >
            {slide.body}
          </div>
        ) : null}
      </div>

      {/* Footer: divider, handle + affordance, progress bar */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", height: 2, backgroundColor: theme.muted, opacity: 0.22 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
          <div style={{ display: "flex", fontSize: 26, color: theme.fg, fontWeight: 700 }}>{handle}</div>
          {isLast || isCta ? (
            <div
              style={{
                display: "flex",
                paddingTop: 10,
                paddingBottom: 10,
                paddingLeft: 24,
                paddingRight: 24,
                borderRadius: 999,
                backgroundColor: theme.accent,
                color: theme.accentFg,
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              Follow for more →
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 24, color: theme.muted, fontWeight: 600, letterSpacing: 1 }}>
              swipe →
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            position: "relative",
            height: 8,
            marginTop: 22,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 896,
              height: 8,
              backgroundColor: theme.muted,
              opacity: 0.25,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${pct}%`,
              height: 8,
              backgroundColor: theme.accent,
            }}
          />
        </div>
      </div>
    </div>
  );
}
