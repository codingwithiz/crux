export interface BrandEntry {
  name: string;
  slug: string; // a valid simple-icons slug
}

/**
 * Brands likely to appear in AI/tech news, with their simple-icons slugs. The
 * Studio's BrandPicker searches this so users never type a raw slug. The live
 * preview degrades gracefully (BrandLogo hides on a 404), so an occasional
 * missing slug shows the name without a logo rather than a broken image.
 */
export const BRAND_INDEX: BrandEntry[] = [
  { name: "OpenAI", slug: "openai" },
  { name: "Anthropic", slug: "anthropic" },
  { name: "Google", slug: "google" },
  { name: "Google Gemini", slug: "googlegemini" },
  { name: "Meta", slug: "meta" },
  { name: "Mistral AI", slug: "mistralai" },
  { name: "Hugging Face", slug: "huggingface" },
  { name: "NVIDIA", slug: "nvidia" },
  { name: "AMD", slug: "amd" },
  { name: "Intel", slug: "intel" },
  { name: "Apple", slug: "apple" },
  { name: "Amazon", slug: "amazon" },
  { name: "Amazon AWS", slug: "amazonaws" },
  { name: "Tesla", slug: "tesla" },
  { name: "Samsung", slug: "samsung" },
  { name: "GitHub", slug: "github" },
  { name: "GitLab", slug: "gitlab" },
  { name: "Vercel", slug: "vercel" },
  { name: "Cloudflare", slug: "cloudflare" },
  { name: "Docker", slug: "docker" },
  { name: "Kubernetes", slug: "kubernetes" },
  { name: "Redis", slug: "redis" },
  { name: "PostgreSQL", slug: "postgresql" },
  { name: "MongoDB", slug: "mongodb" },
  { name: "Supabase", slug: "supabase" },
  { name: "Stripe", slug: "stripe" },
  { name: "Notion", slug: "notion" },
  { name: "Slack", slug: "slack" },
  { name: "Discord", slug: "discord" },
  { name: "Figma", slug: "figma" },
  { name: "Linear", slug: "linear" },
  { name: "Python", slug: "python" },
  { name: "TypeScript", slug: "typescript" },
  { name: "React", slug: "react" },
  { name: "Next.js", slug: "nextdotjs" },
  { name: "Node.js", slug: "nodedotjs" },
  { name: "X", slug: "x" },
  { name: "LinkedIn", slug: "linkedin" },
  { name: "YouTube", slug: "youtube" },
  { name: "Reddit", slug: "reddit" },
  { name: "TikTok", slug: "tiktok" },
  { name: "Instagram", slug: "instagram" },
  { name: "Spotify", slug: "spotify" },
];

/** Search by name or slug — prefix matches first, then substring. */
export function searchBrands(q: string, limit = 8): BrandEntry[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const starts = BRAND_INDEX.filter((b) => b.name.toLowerCase().startsWith(s) || b.slug.startsWith(s));
  const startSet = new Set(starts);
  const contains = BRAND_INDEX.filter(
    (b) => !startSet.has(b) && (b.name.toLowerCase().includes(s) || b.slug.includes(s)),
  );
  return [...starts, ...contains].slice(0, limit);
}
