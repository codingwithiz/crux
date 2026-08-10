import { getNews, getTopicNews } from "@/lib/sources";

export const runtime = "nodejs";
export const revalidate = 900;

/**
 * The feed. With `?topics=a,b,c` it returns items fetched *for those topics*
 * instead of the general AI scan — that's what a followed interest reaches for.
 *
 * Public and unauthenticated, like the general scan: it spends no model budget,
 * and the upstream calls are cached for 15 minutes inside `jtext`.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("topics");
  const topics = raw ? raw.split(",").map((t) => t.trim()).filter(Boolean) : [];
  try {
    return Response.json({ items: topics.length ? await getTopicNews(topics) : await getNews() });
  } catch (e) {
    return Response.json({ items: [], error: (e as Error).message });
  }
}
