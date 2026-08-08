import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigured as configured } from "../env";

/** Browser Supabase client. RLS scopes every query to the signed-in user. */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** True when Supabase env vars are present (cloud mode); otherwise localStorage. */
export function supabaseConfigured(): boolean {
  return configured;
}
