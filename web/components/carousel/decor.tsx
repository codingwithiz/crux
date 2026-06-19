/**
 * Hand-drawn / editorial decoration primitives for the carousel canvas:
 * grain overlay, squiggle underline, hand arrow, corner doodles, and a dynamic
 * brand logo. All pure SVG/CSS so modern-screenshot can embed them faithfully.
 */
"use client";
import { useId, type CSSProperties } from "react";

/** Subtle paper/film grain over the whole slide. Inline SVG so the filter
 *  fragment resolves locally (no /%23n 404) and embeds cleanly on export. */
export function GrainOverlay({ strength, mode }: { strength: number; mode: "light" | "dark" }) {
  const fid = `grain-${useId().replace(/:/g, "")}`;
  const opacity = strength * (mode === "light" ? 0.06 : 0.1);
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity,
        mixBlendMode: mode === "light" ? "multiply" : "screen",
        pointerEvents: "none",
      }}
    >
      <filter id={fid}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${fid})`} />
    </svg>
  );
}

/** A hand-drawn wavy underline that stretches to the width of its parent. */
export function Squiggle({ color, style }: { color: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 120 10"
      preserveAspectRatio="none"
      style={{ position: "absolute", left: 0, right: 0, bottom: -14, width: "100%", height: 14, ...style }}
      aria-hidden
    >
      <path
        d="M1 6 Q 10 1, 20 6 T 40 6 T 60 6 T 80 6 T 100 6 T 119 6"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A loose, hand-drawn arrow (defaults to pointing right). */
export function HandArrow({ color, size = 120 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.32} viewBox="0 0 120 38" fill="none" aria-hidden>
      <path d="M4 22 C 38 8, 78 8, 110 18" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <path d="M96 8 L 113 18 L 95 28" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Playful line-art eye doodle (top-corner accent). */
export function DoodleEye({ color, size = 130 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 130 80" fill="none" aria-hidden>
      <path d="M6 40 C 35 8, 95 8, 124 40 C 95 72, 35 72, 6 40 Z" stroke={color} strokeWidth={3} />
      <circle cx="65" cy="40" r="17" stroke={color} strokeWidth={3} />
      <circle cx="65" cy="40" r="6" fill={color} />
      {[18, 30, 100, 112].map((x, i) => (
        <path key={i} d={`M${x} ${i < 2 ? 22 : 22} L ${x - 6} 8`} stroke={color} strokeWidth={3} strokeLinecap="round" />
      ))}
    </svg>
  );
}

/** Playful line-art ghost doodle (top-corner accent). */
export function DoodleGhost({ color, size = 120 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138" fill="none" aria-hidden>
      <path
        d="M16 70 C 16 30, 104 30, 104 70 L 104 120 L 90 108 L 76 120 L 60 108 L 44 120 L 30 108 L 16 120 Z"
        stroke={color}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <circle cx="48" cy="66" r="8" stroke={color} strokeWidth={3} />
      <circle cx="78" cy="66" r="8" stroke={color} strokeWidth={3} />
      <circle cx="48" cy="66" r="2.5" fill={color} />
      <circle cx="78" cy="66" r="2.5" fill={color} />
    </svg>
  );
}

/**
 * A brand logo by simple-icons slug, served from the simpleicons CDN (brand
 * color by default, or a forced hex). CORS-enabled so it embeds on export.
 */
export function BrandLogo({ slug, size = 64, color }: { slug: string; size?: number; color?: string }) {
  const src = color ? `https://cdn.simpleicons.org/${slug}/${color.replace("#", "")}` : `https://cdn.simpleicons.org/${slug}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={slug} width={size} height={size} style={{ display: "block", objectFit: "contain" }} crossOrigin="anonymous" />
  );
}
