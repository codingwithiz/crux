import type { Calibration, CalibrationVerdict } from "@/lib/ledger-stats";
import { CONF_P } from "@/lib/ledger-stats";
import type { Confidence } from "@/lib/types";

/**
 * "Were you right when you were confident?" — drawn.
 *
 * The ledger already computed everything this needs and rendered it as three
 * flat tiles reading `100% / — / 50%`, which is data without a finding. A
 * calibration plot is the one picture this product is actually about: what you
 * said against what happened, with the line you'd sit on if your confidence
 * meant what you thought it meant.
 *
 * Plain SVG on a 0-1 scale in both axes. No charting dependency: three points
 * and a diagonal do not need one.
 */

const BANDS: Confidence[] = ["low", "med", "high"];
const LABEL: Record<Confidence, string> = { low: "Low", med: "Med", high: "High" };

// Viewport is a unit square inset by the axis gutters, so every coordinate
// below is just the probability itself.
// The left gutter has to hold "broke" at the type size below, or the label
// renders outside the viewBox and is clipped by the SVG edge.
const PAD_L = 22;
const PAD_B = 10;
const SIZE = 100;
// It was the quietest element on the Ledger scorecard — hairline strokes and
// axis type effectively ~8.6px next to a 44px accuracy numeral and four
// bordered stat tiles. §10 calls this "the one picture this product is
// actually about"; the tiles are gone (LedgerView now gives it its own
// section) and the drawing itself is heavier: bigger box, thicker lines,
// larger axis type, a bigger dot.
const AXIS_TYPE = 5.5;
const x = (p: number) => PAD_L + p * (SIZE - PAD_L);
const y = (p: number) => (1 - p) * (SIZE - PAD_B);

export function CalibrationChart({
  cal,
  verdict,
}: {
  cal: Calibration;
  verdict: CalibrationVerdict | null;
}) {
  const points = BANDS.filter((b) => cal.byConfidence[b].resolved > 0).map((b) => ({
    band: b,
    stated: CONF_P[b],
    actual: cal.byConfidence[b].hitRate as number,
    n: cal.byConfidence[b].resolved,
  }));

  return (
    // Chart and finding side by side once there is room: the sentence is the
    // point, and stacked under a square plot it fell below the fold.
    <figure className="m-0 flex flex-col gap-5 sm:flex-row sm:items-start">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-56 w-56 shrink-0 sm:h-64 sm:w-64"
        role="img"
        aria-label={
          points.length
            ? `Calibration: ${points
                .map((p) => `${LABEL[p.band]} confidence held ${Math.round(p.actual * 100)}% of ${p.n}`)
                .join("; ")}`
            : "Calibration chart, nothing scored yet"
        }
      >
        {/* Perfect calibration. Everything else on this chart is read against it. */}
        <line
          x1={x(0)}
          y1={y(0)}
          x2={x(1)}
          y2={y(1)}
          stroke="var(--color-line)"
          strokeWidth="0.9"
          strokeDasharray="2.5 2.5"
        />
        {/* Axis rules, drawn rather than boxed: a full frame would read as a
            panel inside a panel. */}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(0)} stroke="var(--color-line)" strokeWidth="0.9" />
        <line x1={x(0)} y1={y(0)} x2={x(0)} y2={y(1)} stroke="var(--color-line)" strokeWidth="0.9" />

        {BANDS.map((b) => (
          <text
            key={b}
            x={x(CONF_P[b])}
            y={SIZE - 2}
            textAnchor="middle"
            className="fill-[var(--color-muted)] font-mono"
            style={{ fontSize: AXIS_TYPE }}
          >
            {LABEL[b]}
          </text>
        ))}
        {[0, 1].map((p) => (
          <text
            key={p}
            x={PAD_L - 3}
            // The top label sits at y=0, where its ascenders would render above
            // the viewBox and get clipped by the SVG edge. Drop it by a line.
            y={y(p) + (p === 1 ? AXIS_TYPE : 1.8)}
            textAnchor="end"
            className="fill-[var(--color-muted)] font-mono"
            style={{ fontSize: AXIS_TYPE }}
          >
            {p === 1 ? "held" : "broke"}
          </text>
        ))}

        {/* A dropline to the diagonal makes the miss itself the visible thing,
            rather than leaving the reader to measure a gap by eye. */}
        {points.map((p) => (
          <line
            key={`d-${p.band}`}
            x1={x(p.stated)}
            y1={y(p.actual)}
            x2={x(p.stated)}
            y2={y(p.stated)}
            stroke="var(--color-accent)"
            strokeWidth="0.9"
            opacity={0.4}
          />
        ))}
        {points.map((p) => (
          <circle
            key={p.band}
            cx={x(p.stated)}
            cy={y(p.actual)}
            // Area, not radius, tracks sample size — a band resolved four times
            // should not look four times as certain.
            r={3 + Math.min(Math.sqrt(p.n), 3.6)}
            fill="var(--color-accent)"
            stroke="var(--color-ink)"
            strokeWidth="1"
          />
        ))}
      </svg>

      <figcaption className="text-small sm:pt-2">
        {verdict ? (
          <>
            <span className="text-fg">{verdictSentence(verdict)}</span>{" "}
            <span className="text-muted">
              Dashed line is perfect calibration; a dot below it means you were more sure than you
              turned out to be.
            </span>
          </>
        ) : (
          <span className="text-muted">
            Score a few takes and this fills in. The dashed line is where your dots would sit if your
            confidence meant exactly what you thought it meant.
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/** The finding, in the product's own voice: plain, concrete, no hedging. */
function verdictSentence(v: CalibrationVerdict): string {
  const pct = Math.round(v.actual * 100);
  const band = LABEL[v.band].toLowerCase();
  const n = v.resolved === 1 ? "once" : `${v.resolved} times`;
  if (v.kind === "over")
    return `You're overconfident at ${band}: those held ${pct}% of the time, scored ${n}.`;
  if (v.kind === "under")
    return `You're underselling your ${band}-confidence calls — they held ${pct}% of the time.`;
  return `Your ${band}-confidence calls are honest: ${pct}%, about what you claimed.`;
}
