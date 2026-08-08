import { z } from "zod";

/**
 * Environment access with one guarantee: values are sanitized before anything
 * uses them. Env vars pasted from a dashboard can carry zero-width characters
 * or a trailing newline, which fail deep inside the Supabase client as an
 * unreadable HTTP header error (commit be5027c). Clean once here rather than at
 * every read site.
 */
const clean = (v: string | undefined) => (v ?? "").replace(/[^\x20-\x7E]/g, "").trim();

export const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Unset is a supported mode (the app falls back to localStorage), so absence
// must stay silent. Set-but-malformed is a deploy mistake and should be loud
// here instead of surfacing later as a confusing runtime failure.
if (SUPABASE_URL && !z.string().url().safeParse(SUPABASE_URL).success) {
  throw new Error(`NEXT_PUBLIC_SUPABASE_URL is set but is not a valid URL: "${SUPABASE_URL}"`);
}

/** True when Supabase env vars are present (cloud mode); otherwise localStorage. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
