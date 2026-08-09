import { createClient, supabaseConfigured } from "./supabase/client";

/**
 * Who is signed in, for the stores that keep a local fallback.
 *
 * The distinction that matters: **not signed in** and **couldn't tell** are
 * different answers. Three copies of this used to catch every error and return
 * null, which reads as "signed out" — so a network blip or an expired refresh
 * token quietly served whatever was left in this browser's local storage as if
 * it were your data. Throwing instead means a caller can degrade honestly, and
 * can never present someone else's content as yours.
 *
 * Returns null only when Supabase isn't configured at all — the supported
 * single-user mode, where local storage genuinely is the store.
 */
export async function currentUserId(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const { data, error } = await createClient().auth.getUser();
  if (error) throw new Error(`auth check failed: ${error.message}`);
  return data.user?.id ?? null;
}
