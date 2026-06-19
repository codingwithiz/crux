import { NextResponse } from "next/server";
import { createServerSupabase, supabaseConfiguredServer } from "@/lib/supabase/server";

/**
 * OAuth callback (Google sign-in via Supabase, PKCE). Exchanges the `code` for a
 * session (sets auth cookies), then redirects to `next`. Supabase must have the
 * Google provider enabled and this URL in its allowed redirect list.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/ledger";

  if (code && supabaseConfiguredServer()) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
