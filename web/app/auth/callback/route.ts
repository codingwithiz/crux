import { NextResponse } from "next/server";
import { createServerSupabase, supabaseConfiguredServer } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/auth-paths";

/**
 * OAuth callback (Google sign-in via Supabase, PKCE). Exchanges the `code` for a
 * session (sets auth cookies), then redirects to /today. Supabase must have the
 * Google provider enabled and this URL in its allowed redirect list — including
 * `http://localhost:3000/auth/callback` for local development.
 *
 * The origin rule lives in lib/auth-paths so it can be asserted directly; see
 * publicOrigin for why the scheme is derived from the host.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const host = publicOrigin(request.headers.get("x-forwarded-host"), request.url);

  if (code && supabaseConfiguredServer()) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${host}/today`);
  }
  return NextResponse.redirect(`${host}/login?error=oauth`);
}
