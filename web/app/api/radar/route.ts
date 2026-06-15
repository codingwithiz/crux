import { createServerSupabase, supabaseConfiguredServer } from "@/lib/supabase/server";
import { rankItems } from "@/lib/rank";
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

    // Server-side relevance: rank against the signed-in user's theses.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: theses } = await supabase
        .from("theses")
        .select("topic,statement")
        .order("created_at", { ascending: false })
        .limit(20);
      const priors = (theses ?? []) as { topic: string; statement: string }[];
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
