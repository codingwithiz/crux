import { createServerSupabase, supabaseConfiguredServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Which providers have a shared key configured on the server (env). Lets the UI
// tell users they can leave the key field blank for that provider.
const serverKeys = () => ({
  google: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
  openai: Boolean(process.env.OPENAI_API_KEY),
  anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
});

// Returns which keys are set for the signed-in user (booleans only, never values).
// serverKeys (the env-key hint) is always included so the UI can show the key
// field as optional even when Supabase/auth is unavailable.
export async function GET() {
  const keys = serverKeys();
  if (!supabaseConfiguredServer()) {
    return Response.json({ configured: false, serverKeys: keys });
  }
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ configured: true, signedIn: false, serverKeys: keys });

    const { data } = await supabase
      .from("user_secrets")
      .select("google_key,openai_key,anthropic_key")
      .eq("user_id", user.id)
      .maybeSingle();

    return Response.json({
      configured: true,
      signedIn: true,
      serverKeys: keys,
      google: Boolean(data?.google_key),
      openai: Boolean(data?.openai_key),
      anthropic: Boolean(data?.anthropic_key),
    });
  } catch {
    return Response.json({ configured: true, signedIn: false, serverKeys: keys });
  }
}

interface SaveBody {
  google?: string;
  openai?: string;
  anthropic?: string;
}

// Upserts the signed-in user's keys. Empty string clears a key.
export async function POST(req: Request) {
  if (!supabaseConfiguredServer()) return Response.json({ error: "no_supabase" }, { status: 400 });
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "not_signed_in" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as SaveBody;
  const row: Record<string, string | null> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if ("google" in body) row.google_key = body.google?.trim() || null;
  if ("openai" in body) row.openai_key = body.openai?.trim() || null;
  if ("anthropic" in body) row.anthropic_key = body.anthropic?.trim() || null;

  const { error } = await supabase.from("user_secrets").upsert(row, { onConflict: "user_id" });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
