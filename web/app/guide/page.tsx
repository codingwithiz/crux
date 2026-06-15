import Link from "next/link";

export const metadata = { title: "Guide — Conviction Engine" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

const STEPS: [string, string][] = [
  ["1 · Today", "Open Today for one curated item worth an opinion (or pick from News, or type your own in Think)."],
  ["2 · Synthesize", "We fetch the real source and break it down — plus an 'In plain English' summary and 'Receipts' (verbatim quotes) so you're grounded, not guessing."],
  ["3 · Your take", "Write one gut sentence. This is yours — the AI never writes it."],
  ["4 · Adversary", "Spar with a Socratic partner that steelmans the other side and asks the hard questions. It refuses to hand you a conclusion."],
  ["5 · Commit", "Save your sharpened thesis + confidence. Hit 'Draft from my discussion' to let AI organize what YOU argued into the optional fields."],
  ["6 · Carousel", "A bold, multi-layout carousel auto-generates in your voice. Edit, re-voice, copy a caption, download the PNGs."],
];

const FAQ: [string, string][] = [
  ["Is it really free?", "Yes. The default path runs on Google Gemini's free tier with no card. Bring your own OpenAI/Anthropic key (BYOK) only if you want a sharper Adversary."],
  ["Why won't the AI just write my opinion?", "That's the whole point. A tool that hands you a finished take produces laundered slop. This one makes you think, then renders the view you committed to."],
  ["What is the Ledger?", "Your compounding track record — every committed thesis, with confidence, evidence, revisions, and (once you resolve them) a calibration score: were you right when you were confident?"],
  ["What is Voice?", "Paste a few of your real posts on the Voice page; the Expressor then writes every carousel in your style. A strong default ships out of the box."],
  ["How grounded is the synthesis?", "For news, we retrieve the actual article text (reader-mode) and synthesize only from it, with verbatim citations. A badge tells you when it's grounded vs. from the model's memory."],
  ["Which model runs which step?", "Synthesize · Curator · Carousel use your default (free Gemini); the Adversary can use a stronger model (e.g. Claude) if you set one. The flow shows the assignment; change it in the Model menu."],
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="font-mono text-xs text-accent">user manual</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">How to use Conviction Engine</h1>
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
          <span className="text-fg">The AI is an adversary that makes you think — never an author
          that writes your opinion.</span> You own two steps (forming the view and committing to it);
          the AI does everything around them — synthesize, interrogate, render.
        </p>
      </Section>

      <Section title="Your first conviction (~10 minutes)">
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
          <li><span className="text-fg">Today</span> — your daily ritual: streak, one pick, a revisit nudge.</li>
          <li><span className="text-fg">News</span> — browse the ranked firehose, or let the Curator pick the few items worth an opinion.</li>
          <li><span className="text-fg">Think</span> — start from your own rough opinion.</li>
          <li><span className="text-fg">Studio</span> — the carousel editor: themes, per-slide layouts (statement / stat / quote / list / split), re-voice, regenerate a single slide, copy caption, export.</li>
          <li><span className="text-fg">Carousels</span> — your saved decks.</li>
          <li><span className="text-fg">Ledger</span> — committed theses, revise/abandon, outcomes + calibration, track record.</li>
          <li><span className="text-fg">Voice</span> — teach it to write like you.</li>
        </ul>
      </Section>

      <Section title="Set up a model key (free)">
        <p>
          Click <span className="text-fg">Model</span> (top-right) → paste a free Google AI Studio key
          (aistudio.google.com/app/apikey — 1,500 requests/day, no card). The dot turns green and
          you&rsquo;re ready. Sign in to sync your ledger, voice, and keys across devices.
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
          Start — form today&rsquo;s conviction →
        </Link>
      </div>
    </div>
  );
}
