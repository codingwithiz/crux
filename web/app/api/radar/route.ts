import { createServerSupabase, supabaseConfiguredServer } from "@/lib/supabase/server";
import type { NewsItem } from "@/lib/types";

export const runtime = "nodejs";

interface SnapshotRow {
  captured_at: string;
  count: number;
  items: NewsItem[];
}

/**
 * Returns the latest daily-radar snapshot (written by /api/cron/radar). The
 * news view reads this so a prepared, ranked brief is waiting without a live
 * fetch. Returns { snapshot: null } when Supabase isn't configured or no scan
 * has run yet — the client then falls back to the live /api/news fetch.
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
    return Response.json({
      snapshot: { capturedAt: row.captured_at, count: row.count, items: row.items ?? [] },
    });
  } catch {
    return Response.json({ snapshot: null });
  }
}
