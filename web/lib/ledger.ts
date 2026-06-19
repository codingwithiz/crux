import type { Thesis } from "./types";
import { createClient, supabaseConfigured } from "./supabase/client";
import { getSettings } from "./settings";
import { embedText } from "./related";

const KEY = "ce.ledger";

// Postgres `id` columns are uuid; legacy localStorage records used nanoid. Coerce
// so a stray non-uuid id can never crash the insert. (Phase 2 cloud migration owns
// the persistent remap of any legacy local data.)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function toUuid(id: string): string {
  return UUID_RE.test(id) ? id : crypto.randomUUID();
}

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
function localReplace(t: Thesis) {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(localGet().map((x) => (x.id === t.id ? t : x))),
    );
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
  outcome: string | null;
  resolved_at: string | null;
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
    outcome: (r.outcome as Thesis["outcome"]) ?? undefined,
    resolvedAt: r.resolved_at ?? undefined,
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
      id: toUuid(t.id),
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

/**
 * Revise a thesis in place — edit the view / confidence / change-trigger, or
 * flip its status (active → updated/abandoned). Re-embeds so re-surfacing
 * reflects the new wording. This is the "update over time" step (PLAN step 7):
 * new evidence re-surfaces a prior thesis, and you act on it here.
 */
export async function updateThesis(t: Thesis): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return localReplace(t);
  const embedding = await embedText(`${t.statement}\n${t.topic}`, getSettings());
  await createClient()
    .from("theses")
    .update({
      topic: t.topic,
      statement: t.statement,
      confidence: t.confidence,
      evidence_for: t.evidenceFor ?? null,
      steelman: t.steelman ?? null,
      change_my_mind: t.changeMyMind ?? null,
      status: t.status,
      outcome: t.outcome ?? null,
      resolved_at: t.resolvedAt ?? null,
      // Only overwrite the embedding when we actually got a fresh one.
      ...(embedding ? { embedding } : {}),
    })
    .eq("id", t.id);
}

export async function removeThesis(id: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return localRemove(id);
  await createClient().from("theses").delete().eq("id", id);
}
