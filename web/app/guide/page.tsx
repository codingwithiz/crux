import Link from "next/link";

export const metadata = { title: "How it works — Crux" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

const STEPS: [string, string][] = [
  ["1 · Pick something", "Open Today for one story worth an opinion — or browse Explore, or type your own thought in Think. Pasting a link works anywhere."],
  ["2 · Break it down", "Crux fetches the real page and pulls out what's new, what's contested, and the skeptic's case — plus a plain-English summary and Receipts (word-for-word quotes) so you're grounded, not guessing."],
  ["3 · Your take", "Write one gut sentence. This is yours — the AI never writes it."],
  ["4 · Talk it through", "Optional. Coach helps you find your take; Spar stress-tests it. Either way your sparring partner argues the other side and refuses to hand you a conclusion."],
  ["5 · Save my take", "Sharpen the sentence, say how sure you are, and save. 'Draft from what I argued' lets AI organize the optional fields out of your own words — never new ones."],
  ["6 · Carousel", "A bold, multi-layout carousel is written in your voice. Edit it, rewrite it in your voice, copy the caption, export PNGs or a LinkedIn-ready PDF."],
];

const FAQ: [string, string][] = [
  ["Do I need my own API key?", "No. Every step runs on this deployment's own key — there is nothing to paste."],
  ["Why won't the AI just write my opinion?", "That's the whole point. A tool that hands you a finished take produces laundered slop. This one makes you think, then renders the view you saved."],
  ["What is my track record?", "Every take you save, with how sure you were, the source it came from, your revisions, and — once you score how it turned out — an accuracy number: were you right when you were confident?"],
  ["What does the You page do?", "Paste a few of your real posts and Crux distills them into a style guide, so every carousel sounds like you. A strong default ships out of the box. The same page holds the topics you follow, which steer your feed."],
  ["How grounded is a breakdown?", "Paste a link — or pick a story from the feed — and Crux fetches the real page text and works only from it. Each quote in Receipts is checked word-for-word against that text and marked verified or unverified, so you can see which claims actually trace back to the source. A badge tells you when a breakdown is grounded in a real page versus drawn from the model's memory."],
  ["What does 'How much thinking?' change?", "It sets how much model effort every step gets — Speed, Balanced, or Deep. Deep is slower and argues harder. You never have to pick a vendor or a model name; Crux uses whichever provider this deployment has a key for."],
  ["Can I redo a carousel I don't like?", "Yes. In the Studio you can rewrite the whole deck in your voice, regenerate a single slide, restyle it across 12 designs, edit any text directly, and reorder or delete slides."],
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="font-mono text-xs text-accent">user manual</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">How Crux works</h1>
      <p className="mt-3 text-muted">
        It doesn&rsquo;t write your posts — it makes you someone worth reading. It walks you from
        raw information to a defensible opinion you own, then renders it as a carousel.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2 font-mono text-xs">
        {["Information", "Understanding", "Insight", "Opinion", "Content"].map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className={`rounded px-2 py-1 ${i === 3 ? "bg-accent text-accent-fg" : "bg-surface text-fg"}`}>
              {s}
            </span>
            {i < 4 && <span className="text-muted">→</span>}
          </span>
        ))}
      </div>

      <Section title="The principle">
        <p>
          <span className="text-fg">The AI argues with you so you think harder — it never writes the
          opinion.</span> You own two steps (forming the view and standing behind it); the AI does
          everything around them — reading the source, pushing back, and designing the carousel.
        </p>
      </Section>

      <Section title="Your first take (~10 minutes)">
        <ol className="space-y-3">
          {STEPS.map(([h, d]) => (
            <li key={h} className="rounded-xl border border-line bg-surface/40 p-4">
              <p className="font-medium text-fg">{h}</p>
              <p className="mt-1">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="The screens">
        <ul className="space-y-2">
          <li><span className="text-fg">Today</span> — your daily ritual: one pick, your streak, and anything you saved for later.</li>
          <li><span className="text-fg">Explore</span> — the ranked feed. Open anything to read it first; nothing is analysed until you ask.</li>
          <li><span className="text-fg">Think</span> — start from your own rough opinion, or paste a link.</li>
          <li><span className="text-fg">Studio</span> — the carousel editor: 12 designs, per-slide layouts (statement / stat / quote / list / split), rewrite in your voice, regenerate one slide, copy the caption, export PNGs, a ZIP, or a PDF.</li>
          <li><span className="text-fg">Library</span> — your saved decks.</li>
          <li><span className="text-fg">Track record</span> — every take you&rsquo;ve saved: revise, abandon, score how it turned out, and watch your accuracy build.</li>
          <li><span className="text-fg">You</span> — the topics you follow, and the voice your carousels are written in.</li>
        </ul>
      </Section>

      <Section title="How much thinking?">
        <p>
          The button top-right sets how hard the models work:{" "}
          <span className="text-fg">Speed</span> answers fastest,{" "}
          <span className="text-fg">Balanced</span> is the default, and{" "}
          <span className="text-fg">Deep</span> is slower but argues properly. There are no vendors
          or model names to choose — Crux uses whatever key this deployment has. A green dot means
          it&rsquo;s ready. Sign in to sync your track record, voice, and carousels across devices.
        </p>
      </Section>

      <Section title="FAQ">
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <div key={q} className="rounded-xl border border-line bg-surface/40 p-4">
              <p className="font-medium text-fg">{q}</p>
              <p className="mt-1">{a}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-10">
        <Link
          href="/today"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110"
        >
          Start — write today&rsquo;s take →
        </Link>
      </div>
    </div>
  );
}
