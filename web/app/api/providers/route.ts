import { requireUser } from "@/lib/api-guard";
import { availableProviders } from "@/lib/ai/server-settings";

export const runtime = "nodejs";

/**
 * Which providers this deployment can actually reach — names only, never key
 * values. The Model menu uses it for a readiness dot and to say what it's
 * running on; it does not use it to offer a choice, because choosing the
 * provider is the server's job.
 */
export async function GET() {
  const caller = await requireUser();
  if (caller instanceof Response) return caller;

  return Response.json({ available: availableProviders() });
}
