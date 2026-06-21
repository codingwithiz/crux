import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client. RLS scopes every query to the signed-in user. */
export function createClient() {
  // Strip any invisible/non-ASCII characters — pasting env vars from dashboards
  // can introduce zero-width spaces or newlines that break HTTP headers.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/[^\x20-\x7E]/g, "").trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.replace(/[^\x20-\x7E]/g, "").trim();
  return createBrowserClient(url, key);
}

/** True when Supabase env vars are present (cloud mode); otherwise localStorage. */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
