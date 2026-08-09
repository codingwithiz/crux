import { CarouselStudio } from "@/components/CarouselStudio";

export const metadata = { title: "Studio — Crux" };

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  return (
    <div>
      <div className="mx-auto max-w-6xl px-5 pt-8">
        <h1 className="text-2xl font-semibold">Studio</h1>
        <p className="mt-1 text-muted">
          Fine-tune the copy, layout, and style, then export as PNGs, a .zip, or a PDF for LinkedIn.
        </p>
      </div>
      {/* No sample deck: the Studio used to open on a stranger's fully-written
          opinion about open-weight models, presented as if it were your draft.
          With nothing to load it now says so. */}
      <CarouselStudio loadId={typeof c === "string" ? c : undefined} />
    </div>
  );
}
