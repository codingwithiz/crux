import type { CarouselTheme, Slide } from "./types";

function titleSize(len: number): number {
  if (len < 50) return 76;
  if (len < 110) return 60;
  if (len < 190) return 48;
  return 38;
}

/**
 * One 1080x1350 carousel slide. Flexbox-only inline styles so the SAME
 * component renders identically in the browser preview and in Satori
 * (next/og ImageResponse). Do not introduce grid/gap-less assumptions.
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

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 96,
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 14,
          height: 1350,
          backgroundColor: theme.accent,
          display: "flex",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, fontWeight: 700, color: theme.accent }}>
          {slide.kicker}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: theme.muted, letterSpacing: 2 }}>
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingTop: 48, paddingBottom: 48 }}>
        {slide.title ? (
          <div
            style={{
              display: "flex",
              fontSize: isHook ? titleSize(slide.title.length) : 54,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -1,
            }}
          >
            {slide.title}
          </div>
        ) : null}
        {slide.body ? (
          <div
            style={{
              display: "flex",
              fontSize: isCta ? 42 : 35,
              color: isHook || isCta ? theme.muted : theme.fg,
              lineHeight: 1.42,
              marginTop: slide.title ? 30 : 0,
              fontWeight: isCta ? 700 : 400,
            }}
          >
            {slide.body}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", width: 84, height: 6, backgroundColor: theme.accent }} />
        <div style={{ display: "flex", fontSize: 26, color: theme.muted, fontWeight: 600 }}>{handle}</div>
      </div>
    </div>
  );
}
