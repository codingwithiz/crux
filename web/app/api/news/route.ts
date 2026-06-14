import { getNews } from "@/lib/sources";

export const runtime = "nodejs";
export const revalidate = 900;

export async function GET() {
  try {
    return Response.json({ items: await getNews() });
  } catch (e) {
    return Response.json({ items: [], error: (e as Error).message });
  }
}
