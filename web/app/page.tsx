import Link from "next/link";

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

const EDGES = [
  {
    title: "Anti-slop by design",
    body: "The AI is a thinking partner, not a ghostwriter. You own the opinion — that's the entire point.",
  },
  {
    title: "World-class carousels",
    body: "Real HTML/CSS, 12 editorial styles, brand-logo theming, exported as pixel-perfect 1080×1350 PNGs and LinkedIn-ready PDFs.",
  },
  {
    title: "A track record that scores itself",
    body: "Every take you save gets scored as reality weighs in. Were you right when you were confident? Now you'll know.",
  },
  {
    title: "One take, every format",
    body: "Turn a take into an X thread, a LinkedIn post, or a carousel — same voice, nothing invented.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* Hero */}
      <section className="ce-fade-up py-20 sm:py-28">
        <p className="font-mono text-sm text-accent">crux</p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
          It doesn’t write your posts. It makes you someone worth reading.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {"Most tools summarize the news or spit out posts. This one lives in the middle — it helps you turn the day's noise into "}
          <span className="text-fg">your own defensible opinion</span>
          {", then a carousel."}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2 font-mono text-xs">
          {CHAIN.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className={i === 3 ? "rounded bg-accent px-2 py-1 text-accent-fg" : "rounded bg-surface px-2 py-1 text-fg"}>
                {s}
              </span>
              {i < CHAIN.length - 1 && <span className="text-muted">→</span>}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/today"
            className="ce-press inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110"
          >
            Write today’s take <span>→</span>
          </Link>
          <Link href="/guide" className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
            See how it works
          </Link>
        </div>
      </section>

      {/* Demo */}
      <section className="pb-6">
        <div className="rounded-2xl border border-line bg-surface/30 p-4">
          <p className="mb-3 text-center font-mono text-xs uppercase tracking-wide text-muted">
            One take, restyled across the design system
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/demo.gif" alt="A carousel restyled across the built-in design system" width={460} className="mx-auto rounded-lg" />
        </div>
      </section>

      {/* Two modes */}
      <section className="border-t border-line py-14">
        <h2 className="text-2xl font-bold tracking-tight">Two ways to use it</h2>
        <p className="mt-1 text-muted">Same engine, your call per item.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface/40 p-6">
            <p className="font-mono text-xs uppercase tracking-wide text-accent">Form a take</p>
            <h3 className="mt-2 text-lg font-semibold">Your own defensible opinion</h3>
            <p className="mt-1 text-sm text-muted">
              Break it down → talk it through with Coach or Spar → save your take → a carousel in your voice. The AI never writes the opinion.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface/40 p-6">
            <p className="font-mono text-xs uppercase tracking-wide text-cool">Explain it</p>
            <h3 className="mt-2 text-lg font-semibold">Brief your audience, clearly</h3>
            <p className="mt-1 text-sm text-muted">
              Break it down → a neutral, easy-to-follow carousel with the key takeaways. No opinion required — just make the story land.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-line py-14">
        <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-line bg-surface/40 p-5">
              <p className="font-mono text-xs text-accent">{s.n}</p>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two ways in */}
      <section className="grid gap-5 border-t border-line py-14 sm:grid-cols-2">
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

      {/* Why it's different */}
      <section className="border-t border-line py-14">
        <h2 className="text-2xl font-bold tracking-tight">Why it’s different</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {EDGES.map((e) => (
            <div key={e.title} className="rounded-2xl border border-line bg-surface/40 p-5">
              <h3 className="text-base font-semibold text-fg">{e.title}</h3>
              <p className="mt-1 text-sm text-muted">{e.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="border-t border-line py-16 text-center">
        <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          Your opinion deserves better than a hot take.
        </h2>
        <p className="mt-3 text-muted">Write one take you can defend today — it takes about ten minutes.</p>
        <Link
          href="/today"
          className="ce-press mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110"
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
      className="group ce-lift rounded-2xl border border-line bg-surface/40 p-7 hover:border-accent hover:bg-surface"
    >
      <p className="font-mono text-xs text-accent">{kicker}</p>
      <h3 className="mt-3 text-2xl font-semibold">{title}</h3>
      <p className="mt-2 text-muted">{desc}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm text-fg">
        Start <span className="transition group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}
