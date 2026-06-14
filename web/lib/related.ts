import type { Settings, Thesis } from "./types";
import { createClient, supabaseConfigured } from "./supabase/client";

export interface RelatedThesis {
  id: string;
  topic: string;
  statement: string;
  confidence: Thesis["confidence"];
  changeMyMind?: string;
  similarity: number;
}

interface MatchRow {
  id: string;
  topic: string;
  statement: string;
  confidence: string;
  change_my_mind: string | null;
  similarity: number;
}

/** Embed `text` via the server (OpenAI). Returns null if unavailable. */
export async function embedText(text: string, settings: Settings): Promise<number[] | null> {
  try {
    const res = await fetch("/api/embed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, settings }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { embedding?: number[] };
    return j.embedding ?? null;
  } catch {
    return null;
  }
}

/**
 * Semantic re-surfacing — prior theses related to `text`. The compounding moat.
 * Cloud + signed-in only (needs pgvector + stored embeddings); returns [] otherwise.
 */
export async function findRelated(
  text: string,
  settings: Settings,
  count = 3,
): Promise<RelatedThesis[]> {
  if (!supabaseConfigured() || !text.trim()) return [];

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const embedding = await embedText(text, settings);
  if (!embedding) return [];

  const { data, error } = await supabase.rpc("match_theses", {
    query_embedding: embedding,
    match_count: count,
  });
  if (error || !data) return [];

  return (data as MatchRow[]).map((r) => ({
    id: r.id,
    topic: r.topic,
    statement: r.statement,
    confidence: r.confidence as Thesis["confidence"],
    changeMyMind: r.change_my_mind ?? undefined,
    similarity: r.similarity,
  }));
}
