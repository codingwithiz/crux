import { CarouselStudio } from "@/components/CarouselStudio";
import { PageHeader } from "@/components/ui/PageHeader";

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
        <PageHeader title="Studio" lead="Fine-tune it, then export PNGs, a .zip, or a LinkedIn PDF." />
      </div>
      {/* No sample deck: the Studio used to open on a stranger's fully-written
          opinion about open-weight models, presented as if it were your draft.
          With nothing to load it now says so. */}
      <CarouselStudio loadId={typeof c === "string" ? c : undefined} />
    </div>
  );
}
