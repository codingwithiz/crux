import Link from "next/link";
import { LandingDemo } from "@/components/LandingDemo";
import { Mark } from "@/components/ui/Ink";
import { Reveal } from "@/components/ui/Reveal";

const CHAIN = ["Information", "Understanding", "Insight", "Opinion", "Content"];

const STEPS = [
  {
    n: "01",
    title: "Break it down",
    body: "Drop a story or a raw thought. Crux reads the real source and tells you what's new, what's contested, and where the skeptics are.",
  },
  {
    n: "02",
    title: "Talk it through",
    body: "A sparring partner pushes back until your take holds up. It never writes the opinion for you — that's the whole point.",
  },
  {
    n: "03",
    title: "Save my take",
    body: "Your take becomes a studio-grade carousel in your voice — and an X thread or LinkedIn post in one click.",
  },
];

/** Ordered by how hard each one is to copy. The track record is the only entry
 *  nothing else in this category has, and it used to be third. */
const EDGES = [
  {
    title: "A track record that scores itself",
    body: "You say how sure you are, in odds. Later you record what actually happened, and Crux plots your confidence against reality. Every other tool in this category helps you publish; none of them tell you whether you were right.",
  },
  {
    title: "Quotes checked, not vouched for",
    body: "Every quote is matched word-for-word against the page that was fetched — a string comparison, not a model saying it looked fine. When it says 1.00, nothing was invented.",
  },
  {
    title: "Anti-slop by design",
    body: "The AI reads, argues, and designs. It will not write the opinion, because the opinion is the only part that was ever yours.",
  },
  {
    title: "Decks that don't look generated",
    body: "Real HTML and CSS, twelve editorial styles, brand-logo theming, exported as 1080×1350 PNGs or a LinkedIn-ready PDF. The preview you edit is the file you post.",
  },
];

/**
 * The latest run from web/eval-history.json, transcribed rather than imported:
 * the file is a growing history and the landing page should never quietly change
 * its claims because a run finished. Update it deliberately, with the commit.
 * Run 2026-08-10, commit 0f30eeb, judge gpt-5.5, 10/10 scored, 0 failed.
 */
const EVAL = {
  citationFaithfulness: 1,
  rows: [
    { label: "Items scored", value: "10 / 10" },
    { label: "Failures", value: "0" },
    { label: "Grounding", value: "3.5" },
    { label: "Clarity", value: "4.3" },
    { label: "Neutrality", value: "4.2" },
    { label: "Deck faithful", value: "4.5" },
    { label: "Deck sharp", value: "4.2" },
    { label: "No fabrication", value: "4.7" },
    { label: "Deck quality", value: "4.1" },
  ],
};

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* Hero: the claim on the left, the thing it makes on the right, live. */}
      <section className="ce-fade-up grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          {/* No eyebrow. "CRUX" above the headline told a visitor who is already
              on crux.dev nothing the wordmark two inches away had not. */}
          <h1 className="max-w-2xl font-serif text-5xl font-semibold leading-[1.03] tracking-tight sm:text-6xl">
            It doesn’t write your posts. It makes you{" "}
            <Mark>someone worth reading</Mark>.
          </h1>
          <p className="mt-6 max-w-xl text-lead text-muted">
            {"Most tools summarize the news or spit out posts. This one lives in the middle — it turns the day's noise into "}
            <span className="text-fg">your own defensible opinion</span>
            {", then a carousel in your voice."}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/today"
              className="ce-press inline-flex items-center gap-2 rounded-control bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg shadow-press transition duration-(--dur-fast) ease-out hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Write today’s take <span>→</span>
            </Link>
            <Link href="/guide" className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
              See how it works
            </Link>
          </div>

          <p className="mt-6 text-xs text-muted">
            Every quote it pulls is checked word-for-word against the source.{" "}
            <span className="text-fg">1.0 citation faithfulness</span> on the current benchmark.
          </p>
        </div>

        {/* The real renderer, cycling the real catalog — not a recording. */}
        <div className="flex justify-center lg:justify-end">
          <LandingDemo width={340} />
        </div>
      </section>

      {/* The chain, as a designed sequence rather than a row of chips. */}
      <section className="ce-rule py-12">
        <p className="font-mono text-xs uppercase tracking-eyebrow text-accent">The path</p>
        <div className="mt-5 grid gap-px overflow-hidden rounded-surface border border-line bg-line sm:grid-cols-5">
          {CHAIN.map((s, i) => (
            <div
              key={s}
              className={`bg-ink px-4 py-5 ${i === 3 ? "bg-accent/10" : ""}`}
            >
              <p className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</p>
              <p className={`mt-1 font-serif text-lg ${i === 3 ? "text-accent" : "text-fg"}`}>{s}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          Everything else on the internet stops at step two. The <Mark tone="pink">opinion</Mark> is
          the part that is yours, and the part Crux refuses to write.
        </p>
      </section>

      {/* How it works.
          Was a row of three equal bordered cards, directly above another row of
          two and another of four — the same object four times, which is the
          clearest signal a page was assembled rather than designed. A numbered
          list with the figures hanging in the margin is what this content is:
          a sequence, set the way print sets a sequence. */}
      <Reveal>
        <section className="ce-rule py-16">
          <h2 className="font-serif text-title font-semibold">How it works</h2>
          <ol className="mt-8">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="grid gap-x-10 gap-y-2 border-t border-line py-7 sm:grid-cols-[3rem_1fr] lg:grid-cols-[5rem_16rem_1fr]"
              >
                <span className="ce-tabular font-mono text-lead leading-none text-accent">{s.n}</span>
                <h3 className="font-serif text-xl leading-snug">{s.title}</h3>
                <p className="ce-measure text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="ce-measure mt-8 text-sm text-muted">
            Don&rsquo;t have a view yet? Stop after step one and take the neutral explainer deck
            instead — the breakdown is useful on its own.
          </p>
        </section>
      </Reveal>

      {/* Why it's different.
          A definition list, not a card grid: the term hangs in its own column
          and the explanation runs at a readable measure beside it. Ordered so
          the track record comes first — it is the only claim here that no
          competitor in this category can make, and it was fourth. */}
      <Reveal>
        <section className="ce-rule py-16">
          <h2 className="font-serif text-title font-semibold">Why it’s different</h2>
          <dl className="mt-8">
            {EDGES.map((e) => (
              <div
                key={e.title}
                className="grid gap-x-10 gap-y-1 border-t border-line py-6 lg:grid-cols-[21rem_1fr]"
              >
                <dt className="font-serif text-xl leading-snug text-fg">{e.title}</dt>
                <dd className="ce-measure text-muted">{e.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Reveal>

      {/* Proof.
          Six sections in, every one of them had been a heading over a row of
          bordered cards — including the four above claiming this thing is good.
          This one breaks that by not being an assertion: it is the eval harness
          output, from web/eval-history.json, with the number that no model gets
          a vote on set at the size it has earned. */}
      <Reveal>
        <section className="ce-rule py-14">
          <h2 className="font-serif text-title font-semibold">Measured, not asserted</h2>
          <p className="ce-measure mt-2 text-muted">
            Ten stories — three of them adversarial: one dense with numbers, one deliberately
            hedged, one pure marketing hype — run through the real pipeline and scored.
          </p>

          <div className="mt-8 grid items-start gap-8 md:grid-cols-[auto_1fr]">
            <div>
              <p className="ce-tabular font-serif text-6xl font-semibold leading-none text-accent sm:text-7xl">
                {EVAL.citationFaithfulness.toFixed(2)}
              </p>
              <p className="mt-2 max-w-56 text-sm text-muted">
                <span className="text-fg">Citation faithfulness.</span> Every quote checked by string
                match against the fetched source. No judge, no opinion —{" "}
                <span className="text-fg">nothing was invented.</span>
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {EVAL.rows.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
                  <dt className="text-muted">{r.label}</dt>
                  <dd className="ce-tabular font-mono text-fg">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-6 text-xs text-muted">
            Judge scores wobble ±0.3 between identical runs, so small movements there are noise. The
            citation number is the one to read.
          </p>
        </section>
      </Reveal>

      {/* Two ways in. Moved down from between the mechanism and the evidence:
          it was asking for the click before the case had been made. */}
      <Reveal>
        <section className="ce-rule grid gap-5 py-14 sm:grid-cols-2">
          <EntryCard
            href="/explore"
            kicker="Explore"
            title="Start from the news"
            desc="Pick a trending story. Crux breaks it down, then a sparring partner makes you defend a take."
          />
          <EntryCard
            href="/think"
            kicker="Think"
            title="Start from your own idea"
            desc="Type a rough opinion. Gather your evidence and the other side's best case, then save a take you can stand behind."
          />
        </section>
      </Reveal>

      {/* Closing. Centred, and the only centred thing on the page — an ending,
          not another section. */}
      <section className="ce-rule py-24 text-center">
        <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          Your opinion deserves better than a hot take.
        </h2>
        <p className="mt-3 text-muted">Write one take you can defend today — it takes about ten minutes.</p>
        {/* Was missing the letterpress the hero CTA has — same action, same
            weight, and it read as a second, lesser button rather than the
            other end of the same one. */}
        <Link
          href="/today"
          className="ce-press mt-6 inline-flex items-center gap-2 rounded-control bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg shadow-press transition duration-(--dur-fast) ease-out hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Start now <span>→</span>
        </Link>
      </section>
    </div>
  );
}

function EntryCard({ href, kicker, title, desc }: { href: string; kicker: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group ce-lift rounded-surface border border-line bg-surface/40 p-7 hover:border-accent hover:bg-surface"
    >
      <p className="font-mono text-xs uppercase tracking-eyebrow text-accent">{kicker}</p>
      <h3 className="mt-3 text-2xl font-semibold">{title}</h3>
      <p className="mt-2 text-muted">{desc}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm text-fg">
        Start <span className="transition group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}
