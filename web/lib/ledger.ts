import type { Thesis } from "./types";
import { createClient, supabaseConfigured } from "./supabase/client";
import { getSettings } from "./settings";
import { embedText } from "./related";

const KEY = "ce.ledger";

// ---- localStorage fallback (anonymous / offline) ----
function localGet(): Thesis[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Thesis[]) : [];
  } catch {
    return [];
  }
}
function localAdd(t: Thesis) {
  try {
    const all = localGet();
    all.unshift(t);
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
function localRemove(id: string) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(localGet().filter((t) => t.id !== id)));
  } catch {
    /* ignore */
  }
}

// ---- Supabase row mapping ----
interface Row {
  id: string;
  topic: string;
  statement: string;
  confidence: string;
  evidence_for: string | null;
  steelman: string | null;
  change_my_mind: string | null;
  source_title: string | null;
  source_url: string | null;
  status: string;
  created_at: string;
}
function rowToThesis(r: Row): Thesis {
  return {
    id: r.id,
    topic: r.topic,
    statement: r.statement,
    confidence: r.confidence as Thesis["confidence"],
    evidenceFor: r.evidence_for ?? undefined,
    steelman: r.steelman ?? undefined,
    changeMyMind: r.change_my_mind ?? undefined,
    createdAt: r.created_at,
    status: r.status as Thesis["status"],
    source: r.source_title ? { title: r.source_title, url: r.source_url ?? undefined } : undefined,
  };
}

async function currentUserId(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  try {
    const { data } = await createClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * The Thesis Ledger — the compounding moat. Cloud (Supabase, per-user via RLS)
 * when signed in; localStorage otherwise. Same interface for both.
 */
export async function getLedger(): Promise<Thesis[]> {
  const userId = await currentUserId();
  if (!userId) return localGet();
  const { data, error } = await createClient()
    .from("theses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(rowToThesis);
}

export async function addThesis(t: Thesis): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return localAdd(t);
  // Embed for semantic re-surfacing (best-effort; null if no embed key).
  const embedding = await embedText(`${t.statement}\n${t.topic}`, getSettings());
  await createClient()
    .from("theses")
    .insert({
      id: t.id,
      user_id: userId,
      embedding: embedding ?? null,
      topic: t.topic,
      statement: t.statement,
      confidence: t.confidence,
      evidence_for: t.evidenceFor ?? null,
      steelman: t.steelman ?? null,
      change_my_mind: t.changeMyMind ?? null,
      source_title: t.source?.title ?? null,
      source_url: t.source?.url ?? null,
      status: t.status,
      created_at: t.createdAt,
    });
}

export async function removeThesis(id: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return localRemove(id);
  await createClient().from("theses").delete().eq("id", id);
}
