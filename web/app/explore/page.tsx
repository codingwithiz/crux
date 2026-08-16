import { BrowseView } from "@/components/BrowseView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Explore — Crux" };

export default function ExplorePage() {
  return (
    // Wider than the reading pages: this one is a list, and a list in a 730px
    // column left two thirds of a 1920px screen empty.
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title="Explore"
        lead="Opening anything is free — nothing is analysed until you ask."
      />
      <BrowseView />
    </div>
  );
}
