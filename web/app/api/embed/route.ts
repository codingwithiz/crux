import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  text?: string;
  settings?: Settings;
}

// Embeddings standardize on OpenAI text-embedding-3-small (1536 dims) to match
// the vector column. Prefer a user-supplied OpenAI key, else the server env.
function openaiKey(s?: Settings): string | undefined {
  if (s?.provider === "openai" && s.apiKey) return s.apiKey;
  if (s?.adversaryProvider === "openai" && s.adversaryApiKey) return s.adversaryApiKey;
  return process.env.OPENAI_API_KEY;
}

export async function POST(req: Request) {
  const { text, settings } = (await req.json().catch(() => ({}))) as Body;
  if (!text || !text.trim()) return Response.json({ error: "empty" }, { status: 400 });

  const apiKey = openaiKey(settings);
  if (!apiKey) return Response.json({ error: "no_embed_key" }, { status: 400 });

  try {
    const { embedding } = await embed({
      model: createOpenAI({ apiKey }).textEmbeddingModel("text-embedding-3-small"),
      value: text.slice(0, 8000),
    });
    return Response.json({ embedding });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "embed_failed" }, { status: 500 });
  }
}
