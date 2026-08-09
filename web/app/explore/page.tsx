import { BrowseView } from "@/components/BrowseView";

export const metadata = { title: "Explore — Crux" };

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Explore</h1>
      <p className="mt-2 text-muted">
        Find something worth thinking about. Open any item to read it first — nothing is analysed
        until you ask. Then either understand it, or form a take you can defend.
      </p>
      <div className="mt-8">
        <BrowseView />
      </div>
    </div>
  );
}
