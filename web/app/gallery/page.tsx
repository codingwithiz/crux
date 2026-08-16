import { GalleryView } from "@/components/GalleryView";
import { PageHeader } from "@/components/ui/PageHeader";

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      {/* No "your work" eyebrow: it said the same thing as the heading. */}
      <PageHeader
        title="Library"
        lead="Saved carousels, ready to reopen, edit, or re-export."
      />
      <GalleryView />
    </div>
  );
}
