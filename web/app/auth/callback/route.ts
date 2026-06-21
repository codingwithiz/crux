import { NextResponse } from "next/server";
import { createServerSupabase, supabaseConfiguredServer } from "@/lib/supabase/server";

/**
 * OAuth callback (Google sign-in via Supabase, PKCE). Exchanges the `code` for a
 * session (sets auth cookies), then redirects to /today. Supabase must have the
 * Google provider enabled and this URL in its allowed redirect list.
 *
 * Uses x-forwarded-host on Vercel because request.url origin can be an internal
 * hostname rather than the public domain.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // On Vercel the public host comes via x-forwarded-host; fall back to origin.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ? `https://${forwardedHost}` : origin;

  if (code && supabaseConfiguredServer()) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${host}/today`);
  }
  return NextResponse.redirect(`${host}/login?error=oauth`);
}
