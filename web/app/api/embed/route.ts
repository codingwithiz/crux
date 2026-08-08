import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { guard } from "@/lib/api-guard";
import { cleanSecret } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  text?: string;
}

export async function POST(req: Request) {
  const caller = await guard("embed");
  if (caller instanceof Response) return caller;

  const { text } = (await req.json().catch(() => ({}))) as Body;
  if (!text || !text.trim()) return Response.json({ error: "empty" }, { status: 400 });

  // Embeddings standardize on OpenAI text-embedding-3-small (1536 dims) to
  // match the vector column, regardless of the chat provider in use.
  const apiKey = cleanSecret(process.env.OPENAI_API_KEY);
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
