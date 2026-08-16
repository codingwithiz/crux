import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "How it works — Crux" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ce-rule mt-10 pt-6">
      <h2 className="font-serif text-title font-semibold">{title}</h2>
      <div className="ce-measure mt-3 space-y-3 text-small leading-relaxed text-muted">{children}</div>
    </section>
  );
}

const STEPS: [string, string][] = [
  ["1 · Pick something", "Open Today for one story worth an opinion — or browse Explore, or type your own thought in Think. Pasting a link works anywhere."],
  ["2 · Break it down", "Crux fetches the real page and pulls out what's new, what's contested, and the skeptic's case — plus a plain-English summary and receipts (word-for-word quotes) so you're grounded, not guessing."],
  ["3 · Your take", "Write one gut sentence. This is yours — the AI never writes it."],
  ["4 · Talk it through", "Optional. Coach helps you find your take; Spar stress-tests it. Either way it argues the other side and refuses to hand you a conclusion."],
  ["5 · Save it", "Sharpen the sentence, say how sure you are — the app tells you what each level means and what it holds you to."],
  ["6 · Carousel", "Your take is rendered as a carousel in your voice. Edit it, rewrite it, copy the caption, export PNGs or a LinkedIn-ready PDF."],
];

// One entry retired per redesign pass rather than left to rot: "How much
// thinking?" is now answered inline by the settings button's own label, and
// the confidence FAQ was folded into "How sure are you?" teaching itself on
// the Save step. A guide that still explains what the product now explains
// itself is redundant, not helpful.
const FAQ: [string, string][] = [
  ["Do I need my own API key?", "No. Every step runs on this deployment's own key — there is nothing to paste."],
  ["Why won't the AI just write my opinion?", "That's the whole point. A tool that hands you a finished take produces laundered slop. This one makes you think, then renders the view you saved."],
  ["What is my Ledger?", "Every take you save, with how sure you were and how it turned out. Score enough of them and a chart plots your stated confidence against reality — the answer to \"were you right when you were confident?\""],
  ["How grounded is a breakdown?", "Paste a link — or pick a story from the feed — and Crux fetches the real page text and works only from it. Each quote in receipts is checked word-for-word against that text and marked verified or unverified. A badge tells you when a breakdown is grounded in a real page versus drawn from the model's memory."],
  ["Can I redo a carousel I don't like?", "Yes. In the Studio you can rewrite the whole deck in your voice, regenerate a single slide, restyle it across 12 designs, edit any text directly, and reorder or delete slides."],
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <PageHeader
        title="How Crux works"
        lead="It doesn't write your posts — it walks you from raw information to a defensible opinion you own, then renders it as a carousel."
      />

      <div className="flex flex-wrap items-center gap-2 font-mono text-micro">
        {["Information", "Understanding", "Insight", "Opinion", "Content"].map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className={`rounded-control px-2 py-1 ${i === 3 ? "bg-accent text-accent-fg" : "bg-surface text-fg"}`}>
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
            <li key={h} className="rounded-surface border border-line bg-surface/40 p-4">
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
          <li><span className="text-fg">Studio</span> — the carousel editor: 12 designs, 4 slide layouts, 10 data-visual modules, rewrite in your voice, copy the caption, export PNGs, a ZIP, or a PDF.</li>
          <li><span className="text-fg">Library</span> — your saved decks.</li>
          <li><span className="text-fg">Ledger</span> — every take you&rsquo;ve saved, and the calibration chart that scores them.</li>
          <li><span className="text-fg">Voice</span> — the topics you follow, and the voice your carousels are written in.</li>
        </ul>
      </Section>

      <Section title="FAQ">
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <div key={q} className="rounded-surface border border-line bg-surface/40 p-4">
              <p className="font-medium text-fg">{q}</p>
              <p className="mt-1">{a}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-10">
        <Link
          href="/today"
          className="ce-press inline-flex items-center gap-2 rounded-control bg-accent px-5 py-2.5 text-small font-medium text-accent-fg shadow-press transition duration-(--dur-fast) ease-out hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Start — write today&rsquo;s take →
        </Link>
      </div>
    </div>
  );
}
