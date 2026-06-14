import { NewsPicker } from "@/components/NewsPicker";

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="font-mono text-xs text-accent">IDEA 1 · NEWS → CONVICTION</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">From the news</h1>
      <p className="mt-2 text-muted">
        Pick a live item from papers, Hacker News, or GitHub. We synthesize it, then the Adversary
        makes you defend a take — before it ever becomes a post.
      </p>
      <div className="mt-8">
        <NewsPicker />
      </div>
    </div>
  );
}
