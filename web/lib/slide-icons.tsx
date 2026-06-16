/** Minimal line-icon vocabulary for content slides. Rendered as a data-URI SVG
 *  <img> (not inline <svg>) so Satori/resvg rasterizes it correctly in the PNG. */

export const ICON_KEYS = [
  "chart",
  "trend",
  "scale",
  "chip",
  "lock",
  "rocket",
  "globe",
  "bulb",
  "warning",
  "code",
  "gear",
  "bolt",
  "money",
  "clock",
  "eye",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export function isIconKey(s?: string): s is IconKey {
  return Boolean(s) && (ICON_KEYS as readonly string[]).includes(s as string);
}

// Inner SVG markup per icon (stroke/fill set on the root wrapper).
const PATHS: Record<IconKey, string> = {
  chart: `<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/>`,
  trend: `<path d="M3 17l6-6 4 4 8-8M21 7v5M21 7h-5"/>`,
  scale: `<path d="M12 3v18M6 21h12M5 7h14"/><path d="M5 7l-3 6h6Z"/><path d="M19 7l-3 6h6Z"/>`,
  chip: `<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3"/>`,
  lock: `<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>`,
  rocket: `<path d="M5 15c-1 2-1 4-1 4s2 0 4-1"/><path d="M9 13s2-7 6-9c2 4 1 9-3 12Z"/><path d="M9 13l2 2"/>`,
  globe: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>`,
  bulb: `<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 00-4-10Z"/>`,
  warning: `<path d="M12 3l10 17H2Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r="0.6"/>`,
  code: `<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>`,
  gear: `<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>`,
  bolt: `<path d="M13 2L4 14h7l-2 8 9-12h-7Z"/>`,
  money: `<circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5a3 3 0 00-3-1.5c-1.5 0-3 .8-3 2.2 0 2.8 6 1.8 6 4.6 0 1.4-1.5 2.2-3 2.2a3 3 0 01-3-1.5"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>`,
  eye: `<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`,
};

/** Full themed SVG as a data URI for an <img src>. */
export function iconDataUri(name: string, color: string): string {
  const inner = PATHS[name as IconKey] ?? PATHS.bulb;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    inner +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
