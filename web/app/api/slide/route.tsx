import { ImageResponse } from "next/og";
import { SlideArt } from "@/lib/slide-render";
import { getTheme, type SlidePayload } from "@/lib/slides";
import { requireUser } from "@/lib/api-guard";

export const runtime = "nodejs";

// Renders a single carousel slide to a 1080x1350 PNG (free, via Satori).
// Superseded by the client-side exporter in lib/carousel/export.ts; this route
// and its render chain are scheduled for deletion in the cleanup phase.
export async function GET(req: Request) {
  const caller = await requireUser();
  if (caller instanceof Response) return caller;

  const d = new URL(req.url).searchParams.get("d");
  if (!d) return new Response("missing slide payload", { status: 400 });

  let payload: SlidePayload;
  try {
    payload = JSON.parse(d) as SlidePayload;
  } catch {
    return new Response("invalid slide payload", { status: 400 });
  }

  return new ImageResponse(
    (
      <SlideArt
        slide={payload.slide}
        theme={getTheme(payload.themeId)}
        index={payload.index}
        total={payload.total}
        handle={payload.handle}
      />
    ),
    { width: 1080, height: 1350 },
  );
}
