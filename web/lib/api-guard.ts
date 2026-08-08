import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "./supabase/server";
import { supabaseConfigured } from "./env";

/** Model calls allowed per user per trailing hour. */
const CALLS_PER_HOUR = 60;
const WINDOW_MS = 60 * 60 * 1000;

export interface Caller {
  /** null in localStorage-only mode, where there is no identity to scope to. */
  userId: string | null;
  supabase: SupabaseClient | null;
}

/**
 * Pages are gated in proxy.ts, but that matcher deliberately excludes /api — so
 * without a check here every model route is an open wallet against the server's
 * provider key. Guarding in-route rather than widening the matcher keeps
 * per-route control: /api/news and /api/radar are read-only and stay public,
 * and cron carries its own shared secret.
 *
 * When Supabase isn't configured the app runs single-user out of localStorage:
 * there is no identity to check and no shared resource to protect, so allow.
 */
async function currentUser(): Promise<Caller | Response> {
  if (!supabaseConfigured) return { userId: null, supabase: null };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return { userId: user.id, supabase };
}

/** Auth only — for routes that read status but spend nothing. */
export async function requireUser(): Promise<Caller | Response> {
  return currentUser();
}

/**
 * Auth + hourly budget, for every route that spends the server's model key.
 * Returns a Response to send back on refusal, or the caller on success.
 *
 * ponytail: fixed window, counted in Postgres. A user can burst up to 2x the
 * limit across a window boundary, which is fine for a personal tool. Move to a
 * sliding window (or Redis) only if this serves untrusted multi-tenant traffic.
 */
export async function guard(route: string): Promise<Caller | Response> {
  const caller = await currentUser();
  if (caller instanceof Response) return caller;
  if (!caller.userId || !caller.supabase) return caller;
  const { userId, supabase } = caller;

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("ai_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("created_at", since);

  if ((count ?? 0) >= CALLS_PER_HOUR) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  // Metering must not fail a request the user is entitled to: until migration
  // 0009 is applied the table is missing, and the limit simply doesn't bite.
  const { error } = await supabase.from("ai_calls").insert({ user_id: userId, route });
  if (error) console.warn(`[guard] ai_calls insert failed for ${route}: ${error.message}`);

  return caller;
}
