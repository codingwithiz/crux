import type { CarouselDesign } from "@/lib/carousel/design";

/**
 * A design, shown as itself.
 *
 * The whole style system — twelve distinct editorial worlds — was picked from a
 * row of twelve unlabelled coloured circles. You could not tell what any of them
 * were without clicking, and the names existed only in a `title` attribute, so
 * the one genuinely distinctive asset in the product was chosen by trial and
 * error. A swatch that carries the ground, the headline face and the accent is
 * the smallest thing that answers "what is this one".
 */
export function DesignSwatch({
  design,
  selected,
  onClick,
  showName = true,
}: {
  design: CarouselDesign;
  selected: boolean;
  onClick: () => void;
  showName?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={design.name}
      aria-pressed={selected}
      className={`ce-press shrink-0 rounded-control border-2 p-1 transition duration-(--dur-fast) ease-out ${
        selected ? "border-accent" : "border-line hover:border-accent/50"
      }`}
    >
      <span
        className="flex h-9 w-14 items-center justify-center rounded-control"
        style={{ backgroundImage: `linear-gradient(160deg, ${design.bg2} 0%, ${design.bg} 70%)` }}
      >
        {/* The headline face, in the design's own ink — the difference between
            "Editorial Paper" and "Ink" is mostly this. */}
        <span
          style={{ color: design.fg }}
          className={`text-sm leading-none ${
            design.headingFont === "mono"
              ? "font-mono"
              : design.headingFont === "sans"
                ? "font-sans font-bold"
                : "font-serif font-semibold"
          }`}
        >
          Aa
        </span>
        <span
          aria-hidden
          className="ml-1 h-3.5 w-1 rounded-full"
          style={{ background: design.accent }}
        />
      </span>
      {showName && (
        <span className="mt-1 block max-w-14 truncate text-micro text-muted">{design.name}</span>
      )}
    </button>
  );
}
