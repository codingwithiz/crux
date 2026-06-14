import { ImageResponse } from "next/og";
import { SlideArt } from "@/lib/slide-render";
import { getTheme, type SlidePayload } from "@/lib/slides";

export const runtime = "nodejs";

// Renders a single carousel slide to a 1080x1350 PNG (free, via Satori).
export async function GET(req: Request) {
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
