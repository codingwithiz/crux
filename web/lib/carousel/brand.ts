/**
 * Brand resolution: the "align with the topic" engine. Given a brand slug (which
 * the Expressor detects from the synthesis), resolve its OFFICIAL color and
 * derive a per-topic color world on top of a base design — so a dedicated tech
 * page stays cohesive (same editorial system) while every post gets its own
 * brand-driven accent, exactly like @itsnextwork.
 *
 * Official hex values mirror simple-icons / brand guidelines. Logos come from
 * the curated full-color set (see logos.tsx) or the simpleicons CDN fallback.
 */
import type { BrandRef, CarouselDesign } from "./design";

export const BRANDS: Record<string, { name: string; hex: string }> = {
  // Curated full-color logos (logos.tsx)
  redis: { name: "Redis", hex: "#DC382D" },
  discord: { name: "Discord", hex: "#5865F2" },
  vercel: { name: "Vercel", hex: "#000000" },
  postgresql: { name: "PostgreSQL", hex: "#336791" },
  stripe: { name: "Stripe", hex: "#635BFF" },
  supabase: { name: "Supabase", hex: "#3ECF8E" },
  // CDN-logo fallback brands (official hex for theming)
  openai: { name: "OpenAI", hex: "#412991" },
  anthropic: { name: "Anthropic", hex: "#D97757" },
  claude: { name: "Claude", hex: "#D97757" },
  google: { name: "Google", hex: "#4285F4" },
  nvidia: { name: "NVIDIA", hex: "#76B900" },
  python: { name: "Python", hex: "#3776AB" },
  typescript: { name: "TypeScript", hex: "#3178C6" },
  react: { name: "React", hex: "#149ECA" },
  nextdotjs: { name: "Next.js", hex: "#000000" },
  docker: { name: "Docker", hex: "#2496ED" },
  kubernetes: { name: "Kubernetes", hex: "#326CE5" },
  mongodb: { name: "MongoDB", hex: "#47A248" },
  cloudflare: { name: "Cloudflare", hex: "#F38020" },
  tailwindcss: { name: "Tailwind CSS", hex: "#06B6D4" },
  github: { name: "GitHub", hex: "#181717" },
  rust: { name: "Rust", hex: "#DEA584" },
};

export function resolveBrand(slug?: string): { name: string; hex: string } | undefined {
  if (!slug) return undefined;
  return BRANDS[slug.toLowerCase()];
}

// ─── color math (contrast-safe accent derivation) ──────────────────────────

type RGB = { r: number; g: number; b: number };
function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(f, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function toHex({ r, g, b }: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
function luminance({ r, g, b }: RGB): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function mix(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

/**
 * Derive a per-topic design: tint the accent (logo wordmark, page dots,
 * callouts, non-semantic bars) with the brand's official color, nudged for
 * contrast against the base background. Semantic good/bad + marker stay fixed
 * so meaning and legibility are constant across topics.
 */
export function applyBrand(design: CarouselDesign, brand?: BrandRef): CarouselDesign {
  const hex = brand?.hex ?? resolveBrand(brand?.slug)?.hex;
  if (!hex) return design;
  let rgb = hexToRgb(hex);
  const L = luminance(rgb);
  if (design.mode === "light" && L > 0.6) rgb = mix(rgb, { r: 0, g: 0, b: 0 }, Math.min(0.55, L - 0.35));
  if (design.mode !== "light" && L < 0.22) rgb = mix(rgb, { r: 255, g: 255, b: 255 }, 0.55);
  const accent = toHex(rgb);
  const accentFg = luminance(rgb) > 0.55 ? "#1a1206" : "#ffffff";
  return { ...design, accent, accentFg };
}
