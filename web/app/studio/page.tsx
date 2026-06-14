import { CarouselStudio } from "@/components/CarouselStudio";
import { thesisToSlides } from "@/lib/slides";
import type { Thesis } from "@/lib/types";

const SAMPLE: Thesis = {
  id: "sample",
  topic: "Open weights vs. frontier labs",
  statement: "Open-weight models will close the gap on coding faster than on reasoning.",
  confidence: "med",
  evidenceFor:
    "Coding has cheap, verifiable rewards — tests pass or they don't — so open RL pipelines scale on it. Open-ended reasoning lacks an equally cheap signal to optimize against.",
  steelman:
    "If a frontier lab publishes a reusable reasoning-RL recipe, open models could close both gaps at once, making the distinction temporary.",
  changeMyMind:
    "An open model matching frontier reasoning within a quarter of a published recipe.",
  createdAt: new Date().toISOString(),
  status: "active",
};

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  return (
    <div>
      <div className="mx-auto max-w-6xl px-5 pt-8">
        <h1 className="text-2xl font-semibold">Carousel Studio</h1>
        <p className="mt-1 text-muted">
          Your carousel is generated automatically as 1080×1350 PNGs — download them, or fine-tune
          the copy and theme below. Loads your latest committed draft, or this sample.
        </p>
      </div>
      <CarouselStudio
        initialSlides={thesisToSlides(SAMPLE, "@you")}
        loadId={typeof c === "string" ? c : undefined}
      />
    </div>
  );
}
