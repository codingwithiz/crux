const KEY = "ce.brandkit";

/** Your reusable identity, stamped on every carousel you make. */
export interface BrandKit {
  handle: string; // e.g. "@yourname"
  name?: string; // optional display name
}

const DEFAULT: BrandKit = { handle: "@you" };

/** Normalize to a single leading "@", no whitespace. */
export function normalizeHandle(raw: string): string {
  const h = raw.trim().replace(/^@+/, "").replace(/\s+/g, "");
  return h ? `@${h}` : "@you";
}

export function getBrandKit(): BrandKit {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<BrandKit>) };
  } catch {
    return DEFAULT;
  }
}

export function saveBrandKit(b: BrandKit): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...b, handle: normalizeHandle(b.handle) }));
  } catch {
    /* ignore */
  }
}
