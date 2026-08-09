import { GalleryView } from "@/components/GalleryView";

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="font-mono text-xs text-accent">your work</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Carousel gallery</h1>
      <p className="mt-2 text-muted">
        Saved carousels, ready to reopen, edit, or re-export. Synced to your account when signed in;
        stored in this browser otherwise.
      </p>
      <div className="mt-8">
        <GalleryView />
      </div>
    </div>
  );
}
