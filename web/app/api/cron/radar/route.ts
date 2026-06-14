import { getNews } from "@/lib/sources";
import { rankItems } from "@/lib/rank";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Phase-2 automated daily radar. Vercel Cron (see vercel.json) calls this once
 * a day; it scans the free AI sources, ranks them by normalized popularity
 * (generic — per-user relevance is applied later in the browser), and stores one
 * snapshot row. Per-user personalization is intentionally NOT done here: the
 * scan is global, so it runs once for everyone, not once per user.
 *
 * Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically when
 * CRON_SECRET is set. We require it when present; if it isn't configured (local
 * dev), the route is open so it stays testable.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });

  let items;
  try {
    items = rankItems(await getNews(), []).slice(0, 30);
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "scan_failed" }, { status: 500 });
  }

  const capturedAt = new Date().toISOString();
  const svc = createServiceSupabase();
  let persisted = false;
  if (svc) {
    const { error } = await svc
      .from("radar_snapshots")
      .insert({ captured_at: capturedAt, count: items.length, items });
    persisted = !error;
  }

  return Response.json({ ok: true, count: items.length, persisted, capturedAt });
}
