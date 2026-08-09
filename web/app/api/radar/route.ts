import { createServerSupabase, supabaseConfiguredServer } from "@/lib/supabase/server";
import { rankItems, interestsAsPriors, type RankInput } from "@/lib/rank";
import type { NewsItem } from "@/lib/types";

export const runtime = "nodejs";

interface SnapshotRow {
  captured_at: string;
  count: number;
  items: NewsItem[];
}

/**
 * Returns the latest daily-radar snapshot (written by /api/cron/radar). When the
 * caller is signed in and has theses, the items are re-ranked server-side for
 * relevance to *their* ledger (popularity blended with keyword overlap) — so
 * personalization no longer happens only in the browser. Returns
 * { snapshot: null } when Supabase isn't configured or no scan has run yet.
 */
export async function GET() {
  if (!supabaseConfiguredServer()) return Response.json({ snapshot: null });
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("radar_snapshots")
      .select("captured_at,count,items")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = data as SnapshotRow | null;
    if (!row) return Response.json({ snapshot: null });

    let items = row.items ?? [];
    let personalized = false;

    // Server-side relevance: rank against what the signed-in user has committed
    // to, plus the topics they said they care about. Both queries are scoped by
    // RLS, so neither needs an explicit user_id filter.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const [{ data: theses }, { data: voice }] = await Promise.all([
        supabase
          .from("theses")
          .select("topic,statement")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("user_voice").select("interests").maybeSingle(),
      ]);
      const priors = [
        ...((theses ?? []) as RankInput[]),
        // Interests carry a new user until they have a ledger — which is the
        // moment the feed most needs to look worth reading.
        ...interestsAsPriors(((voice?.interests as string[] | null) ?? []).filter(Boolean)),
      ];
      if (priors.length) {
        items = rankItems(items, priors);
        personalized = true;
      }
    }

    return Response.json({
      snapshot: { capturedAt: row.captured_at, count: row.count, items, personalized },
    });
  } catch {
    return Response.json({ snapshot: null });
  }
}
