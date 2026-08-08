import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigured, cleanSecret } from "../env";

/** Server Supabase client (route handlers / server components). Reads the
 *  signed-in user's session from cookies so RLS scopes queries to them. */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* called outside a mutable cookie context — ignore */
          }
        },
      },
    },
  );
}

export function supabaseConfiguredServer(): boolean {
  return supabaseConfigured;
}

/** Service-role client for trusted server jobs (Cron). Bypasses RLS, so it is
 *  ONLY for server contexts with no user session. Returns null when the
 *  service key isn't configured, so callers degrade gracefully. */
export function createServiceSupabase() {
  const serviceKey = cleanSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!SUPABASE_URL || !serviceKey) return null;
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
