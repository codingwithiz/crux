import Link from "next/link";

const CHAIN = ["Information", "Understanding", "Insight", "Opinion", "Content"];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="ce-fade-up py-20 sm:py-28">
        <p className="font-mono text-sm text-accent">conviction engine</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          {"It doesn’t write your posts."}
          <br className="hidden sm:block" />
          {" It makes you someone worth reading."}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          {
            "Most tools summarize the news or spit out posts. This one lives in the middle — it helps you turn the AI firehose into "
          }
          <span className="text-fg">your own defensible opinion</span>
          {", then a carousel. Free forever."}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2 font-mono text-xs">
          {CHAIN.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span
                className={
                  i === 3
                    ? "rounded bg-accent px-2 py-1 text-accent-fg"
                    : "rounded bg-surface px-2 py-1 text-fg"
                }
              >
                {s}
              </span>
              {i < CHAIN.length - 1 && <span className="text-muted">→</span>}
            </span>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/today"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition hover:brightness-110"
          >
            Form today&rsquo;s conviction <span>→</span>
          </Link>
        </div>
      </section>

      <section className="grid gap-5 pb-10 sm:grid-cols-2">
        <EntryCard
          href="/news"
          kicker="IDEA 1"
          title="From the news"
          desc="Pick a trending AI item. We synthesize it, then the Adversary makes you defend a take."
        />
        <EntryCard
          href="/think"
          kicker="IDEA 2"
          title="From your thought"
          desc="Type a rough opinion. Gather evidence and the strongest counter, then commit a calibrated view."
        />
      </section>

      <section className="pb-24">
        <Link
          href="/studio"
          className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Or jump straight to the Carousel Studio →
        </Link>
      </section>
    </div>
  );
}

function EntryCard({
  href,
  kicker,
  title,
  desc,
}: {
  href: string;
  kicker: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-line bg-surface/40 p-7 transition hover:border-accent hover:bg-surface"
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
