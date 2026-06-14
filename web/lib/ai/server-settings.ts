import type { Settings } from "../types";
import { createServerSupabase, supabaseConfiguredServer } from "../supabase/server";

interface SecretsRow {
  google_key: string | null;
  openai_key: string | null;
  anthropic_key: string | null;
}

/**
 * Merge the signed-in user's server-stored keys into request settings.
 * Precedence per provider: request-body key (if any) > user_secrets (DB) > env
 * (handled later in getModel). So signed-in users need not send keys in the body.
 */
export async function resolveServerSettings(s: Settings | undefined): Promise<Settings> {
  const base: Settings = s ?? { provider: "google" };
  if (!supabaseConfiguredServer()) return base;
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return base;

    const { data } = await supabase
      .from("user_secrets")
      .select("google_key,openai_key,anthropic_key")
      .eq("user_id", user.id)
      .maybeSingle();
    const row = data as SecretsRow | null;
    if (!row) return base;

    const keyFor = (p?: string): string | undefined => {
      if (p === "openai") return row.openai_key ?? undefined;
      if (p === "anthropic") return row.anthropic_key ?? undefined;
      if (p === "google") return row.google_key ?? undefined;
      return undefined;
    };

    const merged: Settings = { ...base };
    if (!merged.apiKey) merged.apiKey = keyFor(merged.provider);
    if (merged.adversaryProvider && !merged.adversaryApiKey) {
      merged.adversaryApiKey = keyFor(merged.adversaryProvider);
    }
    return merged;
  } catch {
    return base;
  }
}
