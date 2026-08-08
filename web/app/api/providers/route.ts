import { requireUser } from "@/lib/api-guard";

export const runtime = "nodejs";

/**
 * Which providers this deployment can actually reach, as booleans — never key
 * values. The Model dialog uses it to show a readiness dot and to say which
 * providers the admin has configured.
 *
 * (Replaces /api/secrets: users no longer bring their own keys, so there are no
 * per-user secrets to read or write. See migration 0009.)
 */
export async function GET() {
  const caller = await requireUser();
  if (caller instanceof Response) return caller;

  return Response.json({
    serverKeys: {
      google: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    },
  });
}
