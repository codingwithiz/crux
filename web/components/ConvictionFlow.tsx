"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { getSettings, SETTINGS_EVENT } from "@/lib/settings";
import { addThesis, removeThesis } from "@/lib/ledger";
import { expressSlides, explainerFromSynthesis } from "@/lib/express-client";
import { saveDraft } from "@/lib/draft";
import { DEFAULT_SLIDE_SIZE } from "@/lib/carousel/size";
import { getBrandKit } from "@/lib/brand-kit";
import { INSPIRATION } from "@/lib/inspiration";
import { findRelated, type RelatedThesis } from "@/lib/related";
import { asCitations } from "@/lib/citations";
import { CONF_P } from "@/lib/ledger-stats";
import { parseInput } from "@/lib/parse-input";
import { saveFlow, loadFlow, clearFlow, flowMatches } from "@/lib/flow-session";
import { Markdown } from "./Markdown";
import { ProgressSteps } from "./ProgressSteps";
import { MicButton } from "./MicButton";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Callout";
import { Underline } from "@/components/ui/Ink";
import { Plate, PlateLabel } from "@/components/ui/Plate";
import { Section } from "@/components/ui/Section";
import { Check, AlertTriangle, Lightbulb, Copy, ExternalLink, Square, BookOpen } from "lucide-react";
import { toast } from "sonner";
import type { Confidence, Settings, Synthesis, Thesis } from "@/lib/types";

type Step = "input" | "synth" | "adversary" | "commit";

const STEPS: { id: Step; label: string }[] = [
  { id: "input", label: "Start" },
  { id: "synth", label: "Breakdown" },
  { id: "adversary", label: "Talk it through" },
  { id: "commit", label: "Save" },
];

const STEP_WHY: Record<Step, string> = {
  input: "Start from your own rough opinion — one sentence is enough.",
  synth: "We read the real source and break it down. Then write your gut take.",
  adversary: "Optional: talk it through. Coach helps you find your take; Spar stress-tests it. It never writes it for you.",
  commit: "Save your take — it becomes a carousel in your voice.",
};

// Stable arrays (module scope) so ProgressSteps doesn't get a new reference on
// every parent render — important during the high-churn streaming step.
const SYNTH_STEPS_NEWS = ["Fetching the source", "Reading the article", "Finding the key debate", "Writing your questions"];
const SYNTH_STEPS_THOUGHT = ["Reading your thought", "Finding the key debate", "Writing your questions"];
const ADVERSARY_THINKING_STEPS = ["Reading your point", "Building the other side's case", "Finding the hard question"];
// The two longest calls in the product had the weakest feedback: a disabled
// button with a changed label, for 10–20 seconds.
const CAROUSEL_STEPS = ["Saving your take", "Drafting the slides", "Picking a layout", "Setting it in your voice"];
const EXPLAINER_STEPS = ["Re-reading the breakdown", "Drafting the slides", "Picking a layout"];

// Instant reply-starters (anti-slop: they prefill a stem the user finishes).
const FOLLOWUPS = [
  { label: "Push back", text: "I push back: " },
  { label: "Concede + refine", text: "Fair point. I'd refine my take to: " },
  { label: "My evidence", text: "My evidence is: " },
];

/** What each confidence actually claims, in the terms it is scored on. Written
 *  as a frequency rather than a probability because "8 times out of 10" is a
 *  thing people can check themselves against and "0.85" is not. */
/** The three settings, named by what they claim rather than by their key —
 *  "low" is not a thing a person says about their own opinion. */
const CONF_LABEL: Record<Confidence, string> = {
  low: "A hunch",
  med: "You lean",
  high: "In public",
};

const CONF_MEANING: Record<Confidence, string> = {
  low: "A hunch. If you made ten calls like this, you'd expect about three to hold up.",
  med: "You lean this way. About six in ten should hold up.",
  high: "You'd argue this in public. About eight or nine in ten should hold up.",
};

/** Background — true, useful, and not what you form an opinion against. Lives
 *  behind the disclosure so the fracture line and the take stay above it. */
const BACKGROUND_ROWS: { key: keyof Synthesis; label: string }[] = [
  { key: "happened", label: "What happened" },
  { key: "newVsRepackaged", label: "New vs. repackaged" },
];

/** The fracture. DESIGN.md §10 gives this its own named section on Think —
 *  it is the part a view is formed against, and it used to be card three of
 *  four inside a collapsed disclosure. */
const BREAK_ROWS: { key: keyof Synthesis; label: string }[] = [
  { key: "keyDebate", label: "The key debate" },
  { key: "skepticCase", label: "The skeptic’s case" },
];

export function ConvictionFlow({
  mode,
  initialInput = "",
  sourceTitle,
  sourceUrl,
}: {
  mode: "thought" | "news";
  initialInput?: string;
  sourceTitle?: string;
  sourceUrl?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(mode === "news" && initialInput ? "synth" : "input");
  const [input, setInput] = useState(initialInput);
  const [take, setTake] = useState("");
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  // Tolerates the legacy bare-string shape from theses committed before quotes
  // carried a verification result.
  const citations = useMemo(() => asCitations(synthesis?.citations), [synthesis]);
  // Stated as a count, not a badge: "3 of 3 matched" is the claim the eval
  // harness makes, and it is the one number here nobody has to trust a model for.
  const verifiedCount = useMemo(() => citations.filter((c) => c.verified).length, [citations]);
  const [related, setRelated] = useState<RelatedThesis[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [parking, setParking] = useState(false);
  /** Set when this flow was resumed from a parked draft (see parkSynthesis). */
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  /**
   * One id for whatever this flow saves, minted at the start and kept.
   *
   * It used to be minted inside the save itself, so a second press banked a
   * second take — and the failure path invited exactly that, telling you your
   * take was saved while re-enabling the button. Stable id + upsert makes the
   * retry finish the job instead of forking it.
   */
  const [saveId, setSaveId] = useState(() => crypto.randomUUID());
  /** Shows the "saved" stamp over the step while we navigate away. */
  const [stamped, setStamped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autosynth = useRef(false);

  useEffect(() => {
    const sync = () => setSettings(getSettings());
    sync();
    // Pick up model changes made mid-flow (e.g. in the Model menu) so the next
    // step — including the streaming Adversary — uses the new model.
    window.addEventListener(SETTINGS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  async function runSynthesis(text: string) {
    setError(null);
    const s = getSettings();
    setSettings(s);
    setLoading(true);
    try {
      // A pasted link is a source, not a thought: route it through retrieval so
      // the synthesis is grounded in the actual page rather than in whatever the
      // model remembers about that URL. Anything typed alongside it stays as the
      // user's own framing.
      const parsed = mode === "news" ? { url: undefined, text } : parseInput(text);
      const url = sourceUrl ?? parsed.url;
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // The route rejects an empty input, so a bare link falls back to the
          // URL itself as the placeholder summary; fetchReadable supplies the
          // real material.
          input: parsed.text || url || text,
          kind: url ? "news" : "thought",
          sourceTitle: sourceTitle ?? parsed.url,
          sourceUrl: url,
          settings: s,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          j.error === "no_model"
            ? "No AI model is configured for this deployment — add a provider key and try again."
            : j.error || "Couldn't break that down. Try again.",
        );
      }
      const data = (await res.json()) as Synthesis;
      setSynthesis(data);
      setStep("synth");
      void findRelated(`${text}\n${data.keyDebate}`, s)
        .then(setRelated)
        .catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // --- Adversary chat ---
  // Stable transport, created ONCE. Recreating DefaultChatTransport on every
  // synthesis/take/settings change and swapping it into useChat churned the
  // chat's internal state; instead we send the per-message context as the
  // request `body` at each sendMessage call (see adversaryBody()).
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/adversary" }), []);
  const { messages, sendMessage, status, setMessages, stop, error: chatError } = useChat({ transport });
  const [chatInput, setChatInput] = useState("");
  const [adversaryMode, setAdversaryMode] = useState<"coach" | "spar">("coach");
  const [hints, setHints] = useState<string[]>([]);
  const [hinting, setHinting] = useState(false);
  // Draft takes to react to when stuck at the gut-take step.
  const [drafts, setDrafts] = useState<string[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const seeded = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const thinking = status === "submitted" || status === "streaming";
  const awaiting = status === "submitted"; // before the first token arrives
  const streaming = status === "streaming";

  function msgText(m: (typeof messages)[number]): string {
    return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  }

  function copyLastReply() {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return;
    void navigator.clipboard.writeText(msgText(last));
    toast.success("Copied the reply");
  }

  async function getHints() {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    setHinting(true);
    setHints([]);
    try {
      const res = await fetch("/api/hints", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: msgText(lastAssistant), take, settings: getSettings() }),
      });
      const j = (await res.json()) as { hints?: string[] };
      setHints(j.hints ?? []);
    } catch {
      /* ignore — hints are optional */
    } finally {
      setHinting(false);
    }
  }

  // Fetch 2-3 divergent draft takes the user can react to and edit. They still
  // pick one, make it theirs, and defend it against the Adversary.
  async function getDrafts() {
    if (!synthesis) return;
    setDraftsLoading(true);
    setDrafts([]);
    try {
      const res = await fetch("/api/take-drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ synthesis, settings: getSettings() }),
      });
      const j = (await res.json()) as { drafts?: string[] };
      setDrafts(j.drafts ?? []);
    } catch {
      /* optional — ignore */
    } finally {
      setDraftsLoading(false);
    }
  }

  function startAdversary() {
    setSettings(getSettings());
    setStep("adversary");
  }

  // Every turn goes through here so it carries the full body — `mode` in
  // particular. The route picks Coach vs Spar per request and falls back to
  // Coach, so a turn that omits it silently downgrades Spar mid-conversation.
  const sendTurn = useCallback(
    (text: string) =>
      sendMessage({ text }, { body: { synthesis, take, settings, mode: adversaryMode } }),
    [sendMessage, synthesis, take, settings, adversaryMode],
  );

  // Single source of truth for seeding the Adversary's opening message: once
  // we're on its step with a take but no conversation yet, send the seed. This
  // covers both a fresh "Pressure-test" click and resuming directly into this
  // step. (Previously resume set seeded=true without ever sending the seed,
  // which hung the chat on "Starting the interrogation…" forever.)
  useEffect(() => {
    if (step !== "adversary" || seeded.current) return;
    if (messages.length > 0) {
      seeded.current = true; // resumed mid-conversation — don't re-seed
      return;
    }
    // Wait for the take and settings so the request routes to gpt-5-mini.
    if (!take.trim() || !settings) return;
    seeded.current = true;
    sendTurn(`My take: ${take}`);
  }, [step, take, settings, messages.length, sendTurn]);

  // Keep the newest reply in view. A bounded transcript that doesn't follow the
  // stream is worse than an unbounded one — the answer arrives out of sight.
  useEffect(() => {
    const el = transcript.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // --- Commit ---
  const [statement, setStatement] = useState("");
  const [confidence, setConfidence] = useState<Confidence>("med");
  const [evidenceFor, setEvidenceFor] = useState("");
  const [steelman, setSteelman] = useState("");
  const [changeMyMind, setChangeMyMind] = useState("");
  const [topic, setTopic] = useState(sourceTitle ?? "");
  const [resumed, setResumed] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [showDepth, setShowDepth] = useState(false);
  const hydrated = useRef(false);

  // Mount: resume a saved in-progress conviction if one matches this flow;
  // otherwise kick off the news auto-synthesis. One effect so there's no race
  // between restoring and auto-running.
  // Restoring a saved flow is inherently post-hydration work: the session lives
  // in localStorage, and seeding from it during render would make the server's
  // markup disagree with the client's.
  /* eslint-disable react-hooks/set-state-in-effect -- see note above */
  useEffect(() => {
    const saved = loadFlow();
    if (flowMatches(saved, mode, sourceTitle)) {
      setStep(saved.step as Step);
      setInput(saved.input);
      setTake(saved.take);
      setSynthesis(saved.synthesis);
      setStatement(saved.commit.statement);
      setConfidence(saved.commit.confidence);
      setEvidenceFor(saved.commit.evidenceFor);
      setSteelman(saved.commit.steelman);
      setChangeMyMind(saved.commit.changeMyMind);
      setTopic(saved.commit.topic);
      setDraftId(saved.draftId);
      if (saved.saveId) setSaveId(saved.saveId);
      // Only mark as seeded when there's an actual conversation to restore;
      // otherwise the seeding effect above will start the Adversary so a
      // resumed-but-unstarted flow doesn't hang.
      if (saved.messages?.length) {
        setMessages(saved.messages);
        seeded.current = true;
      }
      autosynth.current = true;
      setResumed(true);
    } else if (mode === "news" && initialInput) {
      autosynth.current = true;
      void runSynthesis(initialInput);
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist progress on every change so a refresh/crash resumes here.
  useEffect(() => {
    if (!hydrated.current || step === "input") return;
    saveFlow({
      mode,
      sourceTitle,
      step,
      input,
      take,
      draftId,
      saveId,
      synthesis,
      messages,
      commit: { statement, confidence, evidenceFor, steelman, changeMyMind, topic },
      savedAt: new Date().toISOString(),
    });
  }, [
    mode, sourceTitle, step, input, take, draftId, saveId, synthesis, messages,
    statement, confidence, evidenceFor, steelman, changeMyMind, topic,
  ]);

  function startOver() {
    clearFlow();
    setSaveId(crypto.randomUUID());
    setResumed(false);
    setSynthesis(null);
    setTake("");
    setMessages([]);
    seeded.current = false;
    setStatement("");
    setConfidence("med");
    setEvidenceFor("");
    setSteelman("");
    setChangeMyMind("");
    setTopic(sourceTitle ?? "");
    if (mode === "news" && initialInput) {
      void runSynthesis(initialInput);
    } else {
      setInput("");
      setStep("input");
    }
  }

  function goCommit() {
    if (!statement.trim()) setStatement(take.trim());
    setStep("commit");
  }

  // End Coach/Spar: compile the user's OWN argued points into a draft (commit-suggest)
  // and jump to Commit pre-filled — so they can review and commit in one click.
  async function finishConversation() {
    if (!statement.trim()) setStatement(take.trim());
    await draftFromDiscussion();
    setStep("commit");
  }

  // Draft the commit fields by organizing the user's OWN take + Adversary
  // answers. Never auto-commits; the user edits before committing.
  async function draftFromDiscussion() {
    setSuggesting(true);
    setError(null);
    try {
      const msgs = messages.map((m) => ({
        role: m.role,
        text: m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" "),
      }));
      const res = await fetch("/api/commit-suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ synthesis, take, messages: msgs, settings: getSettings() }),
      });
      const j = (await res.json()) as Partial<Thesis> & { confidence?: Confidence; error?: string };
      if (!res.ok) {
        throw new Error(
          j.error === "no_model" ? "No model key — add one in the Model menu (top-right)." : j.error || "Draft failed",
        );
      }
      if (j.statement) setStatement(j.statement);
      if (j.confidence) setConfidence(j.confidence);
      if (j.evidenceFor) setEvidenceFor(j.evidenceFor);
      if (j.steelman) setSteelman(j.steelman);
      if (j.changeMyMind) setChangeMyMind(j.changeMyMind);
      if (j.topic) setTopic(j.topic);
      setShowDepth(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  }

  // Skip the opinion entirely: build a NEUTRAL explainer carousel from the
  // synthesis we already have (no adversary, no commit), then go to the Studio.
  async function makeExplainer() {
    if (!synthesis) return;
    setExplaining(true);
    setError(null);
    try {
      const handle = getBrandKit().handle;
      const { slides, designId, format } = await explainerFromSynthesis(synthesis, sourceTitle, handle);
      // Carry what this was made from, so the Studio can offer another version.
      saveDraft({
        slides: slides.map((sl) => ({ ...sl, size: DEFAULT_SLIDE_SIZE })),
        handle,
        designId,
        context: { mode: "explain", synthesis, sourceTitle, format },
      });
      clearFlow();
      router.push("/studio");
    } catch (e) {
      setError((e as Error).message);
      setExplaining(false);
    }
  }

  // Park the understanding without forming an opinion. Some things are worth
  // reading and thinking about before you have a take — and forcing one on the
  // spot is how you end up publishing a view you don't hold.
  async function parkSynthesis() {
    if (!synthesis) return;
    setParking(true);
    setError(null);
    try {
      const source = synthesis.source ?? (sourceTitle ? { title: sourceTitle, url: sourceUrl } : undefined);
      await addThesis({
        id: draftId ?? saveId,
        topic: topic.trim() || sourceTitle || input.trim().slice(0, 80) || "Saved for later",
        statement: "",
        confidence,
        synthesis,
        createdAt: new Date().toISOString(),
        source,
        status: "draft",
      });
      clearFlow();
      toast.success("Saved for later — pick it up from Today");
      router.push("/today");
    } catch (e) {
      setError((e as Error).message);
      setParking(false);
    }
  }

  /** Bank the thesis. Shared by both commit paths; returns it for the caller. */
  async function bankThesis(): Promise<Thesis> {
    const thesis: Thesis = {
      id: saveId,
      topic: topic.trim() || (mode === "news" ? sourceTitle ?? "AI" : "My take"),
      statement: statement.trim() || take.trim(),
      confidence,
      evidenceFor: evidenceFor.trim() || undefined,
      steelman: steelman.trim() || undefined,
      changeMyMind: changeMyMind.trim() || undefined,
      // Carry the synthesis so the carousel can ground itself in what actually
      // happened (the Expressor reads thesis.synthesis via express-client).
      synthesis: synthesis ?? undefined,
      createdAt: new Date().toISOString(),
      source: sourceTitle ? { title: sourceTitle, url: sourceUrl } : undefined,
      status: "active",
    };
    await addThesis(thesis);
    // This flow started life as a parked draft; the committed thesis replaces
    // it, so retire the placeholder rather than leaving both in the ledger.
    if (draftId) await removeThesis(draftId).catch(() => {});
    return thesis;
  }

  /**
   * Commit the opinion and stop. Forming a defensible view is worth something on
   * its own — the previous flow always generated a carousel and dropped you in
   * the Studio, which assumed everyone came here to publish.
   */
  async function commitOnly() {
    setLoading(true);
    setError(null);
    try {
      await bankThesis();
      clearFlow();
      // The one moment in this flow worth marking: you committed to a view.
      // Long enough to read the stamp, short enough not to be a wait.
      setStamped(true);
      await new Promise((r) => setTimeout(r, 900));
      router.push("/ledger");
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  async function commit() {
    setLoading(true);
    setError(null);
    try {
      const thesis = await bankThesis();
      const handle = getBrandKit().handle;
      const { slides, designId, format } = await expressSlides(thesis, handle);
      saveDraft({
        slides: slides.map((sl) => ({ ...sl, size: DEFAULT_SLIDE_SIZE })),
        handle,
        designId,
        context: { mode: "express", thesis, synthesis: thesis.synthesis, sourceTitle, format },
      });
      clearFlow();
      router.push("/studio");
    } catch (e) {
      // The take may already be saved at this point, so say so rather than
      // leaving the button stuck on "Building carousel…" forever (it was).
      setError(
        `${(e as Error).message} — your take was saved; make the carousel from your Ledger.`,
      );
      setLoading(false);
    }
  }

  const activeIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div>
      {/* progress */}
      <div className="mb-6 flex items-center gap-2 text-micro">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            {/* Done, here, and not yet — three states that have to be legible at
                a glance. Completed used to be bg-surface against bg-surface/50
                for upcoming, a difference of nothing, so the rail showed where
                you were but never how far you had come. */}
            <span
              className={`inline-flex items-center gap-1 rounded-control px-2 py-1 font-mono ${
                i === activeIdx
                  ? "bg-accent text-accent-fg"
                  : i < activeIdx
                    ? "border border-success/40 bg-success/10 text-success"
                    : "border border-line text-muted"
              }`}
            >
              {i < activeIdx && <Check aria-hidden className="h-3 w-3" />}
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-muted">→</span>}
          </div>
        ))}
      </div>

      {/* The chips above already say which step this is; a second bordered
          "Step 1 of 4" panel restated it and pushed the actual content down. */}
      <p className="-mt-4 mb-6 text-small text-muted">{STEP_WHY[step]}</p>

      {resumed && (
        <Callout tone="info" className="mb-5 flex items-center justify-between gap-3">
          <span>Picked up where you left off.</span>
          <button onClick={startOver} className="shrink-0 text-small underline-offset-4 hover:underline">
            Start over
          </button>
        </Callout>
      )}

      {error && (
        <Callout tone="warning" className="mb-4">
          {error}
        </Callout>
      )}

      {step === "input" && (
        <div className="ce-fade-up">
          <label className="block text-small font-medium">A thought, a link, or both</label>
          <p className="mt-1 text-small text-muted">
            Paste a link and we read the actual page before breaking it down. Add your own take alongside
            it and we keep them apart.
          </p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder="e.g. AI agents will make most SaaS dashboards obsolete within two years.&#10;or: https://example.com/article — I think the author is too optimistic."
            className="mt-2 w-full resize-none rounded-surface border border-line bg-surface/40 px-4 py-3 text-base outline-none focus:border-accent"
          />
          <div className="mt-2">
            <MicButton onText={(t) => setInput((p) => (p ? `${p} ${t}` : t))} />
          </div>
          {/* The page's only action, and until now the page opened with it
              rendered as amber at 50% — a muddy olive that still reads as a
              filled button you can press. Through Button, an unavailable
              primary recedes to an outline and a loading one keeps its fill. */}
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => runSynthesis(input)}
            disabled={!input.trim()}
            loading={loading}
            loadingLabel="Breaking it down…"
          >
            Break it down →
          </Button>

          <div className="mt-6 border-t border-line pt-4">
            <p className="text-small text-muted">Blank page? Start from a spark — then make it your own:</p>
            {/* Three whole sentences, not six cut at 52 characters. Every spark
                was truncated, so the row read as six near-identical stubs and
                you had to click one to find out what it said. */}
            <div className="mt-2 flex flex-col items-start gap-1.5">
              {INSPIRATION.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="ce-measure rounded-full border border-line px-3 py-1 text-left text-small text-muted transition duration-(--dur-fast) ease-out hover:border-cool/50 hover:bg-surface hover:text-fg"
                  title="Use as a starting point — edit it into your own words"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "synth" && (
        <div className="ce-fade-up">
          {loading && !synthesis ? (
            <ProgressSteps steps={mode === "news" ? SYNTH_STEPS_NEWS : SYNTH_STEPS_THOUGHT} />
          ) : synthesis ? (
            <>
              {/* WHAT THE SOURCES SAY — §10's first named section.
                  This was a paper Plate, which made the model's summary the one
                  physical artifact on a screen whose entire purpose is the
                  user's own sentence. §10: "keep AI output visually
                  subordinate." Still serif, still at measure — but on ink, so
                  the paper below it is the only paper. */}
              <Section
                label="What the sources say"
                className="border-t-0 pt-0"
                aside={
                  /* Shown on every path, not just the news feed. Gating this on
                     mode === "news" was what let a pasted link produce a
                     confident summary of a page nobody fetched. */
                  <span className="flex items-center gap-3 font-mono text-micro">
                    {synthesis.grounded ? (
                      <span className="inline-flex items-center gap-1 uppercase tracking-eyebrow text-success">
                        <Check className="h-3 w-3" /> grounded in the source
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 uppercase tracking-eyebrow text-warning">
                        <AlertTriangle className="h-3 w-3" /> from the model&rsquo;s memory — check it
                      </span>
                    )}
                    {(synthesis.source?.url ?? sourceUrl) && (
                      <a
                        href={synthesis.source?.url ?? sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 uppercase tracking-eyebrow text-muted underline-offset-4 hover:text-fg hover:underline"
                      >
                        open source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </span>
                }
              >
                {synthesis.plainEnglish && (
                  <p className="ce-measure font-serif text-lead leading-relaxed text-fg">
                    {synthesis.plainEnglish}
                  </p>
                )}

                {/* Background. Four same-weight bordered cards became two rows
                    behind a disclosure — the material that is true but is not
                    what you form a view against. */}
                <details className="group mt-4">
                  <summary className="cursor-pointer list-none text-small text-muted underline-offset-4 hover:text-fg hover:underline">
                    <span className="group-open:hidden">Read the full breakdown</span>
                    <span className="hidden group-open:inline">Hide the full breakdown</span>
                  </summary>
                  <dl className="mt-3">
                    {BACKGROUND_ROWS.map((r, i) => (
                      <div
                        key={r.key}
                        style={{ "--i": i } as React.CSSProperties}
                        className="ce-stagger grid gap-x-8 gap-y-1 border-t border-line py-3 sm:grid-cols-[10rem_1fr]"
                      >
                        <dt className="font-mono text-micro uppercase tracking-eyebrow text-muted">
                          {r.label}
                        </dt>
                        <dd className="ce-measure text-small leading-relaxed text-fg">
                          {synthesis[r.key] as string}
                        </dd>
                      </div>
                    ))}
                    {synthesis.questions?.length > 0 && (
                      <div className="grid gap-x-8 gap-y-1 border-t border-line py-3 sm:grid-cols-[10rem_1fr]">
                        <dt className="font-mono text-micro uppercase tracking-eyebrow text-muted">
                          Answer first
                        </dt>
                        <dd>
                          <ul className="ce-measure space-y-1 text-small text-muted">
                            {synthesis.questions.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    )}
                  </dl>
                </details>
              </Section>

              {/* WHERE IT BREAKS — §10's second named section. The key debate
                  and the skeptic's case are the fracture a view is formed
                  against; they were cards three and four inside a disclosure
                  that defaulted shut once you started typing. */}
              <Section label="Where it breaks" className="mt-8">
                <dl>
                  {BREAK_ROWS.map((r) => (
                    <div
                      key={r.key}
                      className="grid gap-x-8 gap-y-1 py-3 first:pt-0 sm:grid-cols-[10rem_1fr]"
                    >
                      <dt className="font-mono text-micro uppercase tracking-eyebrow text-accent">
                        {r.label}
                      </dt>
                      <dd className="ce-measure leading-relaxed text-fg">
                        {synthesis[r.key] as string}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Section>

              {/* Receipts. §11: a verified quote should feel like a receipt and
                  an unverified one visibly uncertain — so the stamp hangs in the
                  margin beside the quote rather than sitting in a box with it,
                  and only the unverified row keeps a tint. */}
              {citations.length > 0 && (
                <Section
                  label="Receipts"
                  className="mt-8"
                  aside={
                    <span className="font-mono text-micro uppercase tracking-eyebrow text-muted">
                      <span className="ce-tabular text-success">{verifiedCount}</span> of{" "}
                      <span className="ce-tabular">{citations.length}</span> matched word-for-word
                    </span>
                  }
                >
                  <ul>
                    {citations.map((c, i) => (
                      <li
                        key={i}
                        className={`grid gap-x-8 gap-y-1.5 py-3.5 first:pt-0 sm:grid-cols-[10rem_1fr] ${
                          c.verified ? "" : "border-l-2 border-warning/50 bg-warning/5 pl-3 sm:pl-4"
                        }`}
                      >
                        {c.verified ? (
                          <span
                            title="Found word-for-word in the source text"
                            style={{ animationDelay: `calc(${i} * 90ms)` }}
                            className="ce-stamp inline-flex h-fit items-center gap-1 font-mono text-micro uppercase tracking-eyebrow text-success"
                          >
                            <Check className="h-3 w-3" /> verified
                          </span>
                        ) : (
                          <span
                            title="We could not match this quote to the source text — treat it with suspicion"
                            className="inline-flex h-fit items-center gap-1 font-mono text-micro uppercase tracking-eyebrow text-warning"
                          >
                            <AlertTriangle className="h-3 w-3" /> not in source
                          </span>
                        )}
                        <div>
                          <p className="ce-measure font-serif leading-relaxed text-fg">
                            &ldquo;{c.quote}&rdquo;
                          </p>
                          {c.sourceTitle && (
                            <span className="mt-1.5 block font-mono text-micro text-muted">
                              {c.sourceTitle}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {related.length > 0 && (
                <Section label="Related to your past thinking" className="mt-8" labelClassName="text-cool">
                  <ul className="space-y-2">
                    {related.map((r) => (
                      <li key={r.id} className="ce-measure text-small text-fg">
                        {r.statement}
                        <span className="ml-2 ce-tabular font-mono text-micro text-cool/70">
                          {Math.round(CONF_P[r.confidence] * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-small text-cool/70">Does today change any of these?</p>
                </Section>
              )}

              {/* YOUR CRUX — §10's third named section, and the reason the
                  screen exists. It was a 14px single-line input in an amber
                  tinted box, six blocks down, while the model's summary was
                  20px serif on paper: the AI several times louder than the
                  human. It is now the page's only paper and its largest type. */}
              <Section label="Your crux" className="mt-8" labelClassName="text-accent">
                <Plate arrive className="p-6 sm:p-8">
                  <label htmlFor="gut-take" className="sr-only">
                    Your take, in one sentence
                  </label>
                  <TakeField
                    id="gut-take"
                    value={take}
                    onChange={setTake}
                    placeholder="Your gut reaction — you'll get to defend it next."
                  />
                  <p className="mt-3 text-small text-paper-muted">
                    One sentence, in your words. You&rsquo;ll get to defend it next.
                  </p>
                </Plate>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <MicButton onText={(t) => setTake((p) => (p ? `${p} ${t}` : t))} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void getDrafts()}
                    loading={draftsLoading}
                    loadingLabel="Thinking…"
                    title="See 2-3 divergent draft takes to react to and edit"
                  >
                    Not sure? See draft takes
                  </Button>
                </div>

                {drafts.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-small text-muted">
                      Starting points, not the answer — pick one, make it yours, then defend it.
                    </p>
                    {drafts.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => setTake(d)}
                        className="block w-full rounded-control border border-line bg-ink/60 px-3 py-2 text-left text-small text-fg transition hover:border-cool/50 hover:bg-surface"
                        title="Use as a starting point — then edit it into your own words"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Button onClick={startAdversary} variant="primary" disabled={!take.trim()}>
                    Talk it through →
                  </Button>
                  {/* "Skip" never said what was being skipped, and sat next to
                      "Save for later", which saves something entirely different.
                      Every exit now names its own outcome. */}
                  <button
                    onClick={goCommit}
                    disabled={!take.trim()}
                    className="text-small text-muted underline-offset-4 transition hover:text-fg hover:underline disabled:opacity-40 disabled:hover:no-underline"
                  >
                    Save it without arguing
                  </button>
                </div>
              </Section>

              {/* Secondary exits: real choices, but not the reason you're here.
                  They used to get a full card each — more space than the primary
                  path — in three different visual treatments. */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-small text-muted">
                <span>Or:</span>
                <button
                  onClick={() => void makeExplainer()}
                  disabled={explaining}
                  className="inline-flex items-center gap-1.5 underline-offset-4 transition hover:text-fg hover:underline disabled:opacity-50"
                >
                  <BookOpen className="h-4 w-4" />
                  {explaining ? "Building…" : "Make an explainer deck"}
                </button>
                <button
                  onClick={() => void parkSynthesis()}
                  disabled={parking}
                  className="underline-offset-4 transition hover:text-fg hover:underline disabled:opacity-50"
                >
                  {parking ? "Saving…" : "Park it — no take yet"}
                </button>
              </div>
              {explaining && (
                <div className="mt-3">
                  <ProgressSteps steps={EXPLAINER_STEPS} />
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {step === "adversary" && (
        <div className="ce-fade-up">
          {/* Coach and Spar are opposite intents and used to be two identical
              pills with a trailing grey fragment, so which one you were talking
              to was the least legible thing on the screen. A segmented control
              with the active side filled, and the difference stated as a whole
              sentence rather than "· tough, stress-tests it". */}
          <div className="mb-3">
            <div
              role="radiogroup"
              aria-label="Sparring mode"
              className="inline-flex rounded-control border border-line p-0.5"
            >
              {(["coach", "spar"] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={adversaryMode === m}
                  onClick={() => setAdversaryMode(m)}
                  className={`ce-press rounded-control px-3.5 py-1 text-small font-medium transition duration-(--dur-fast) ease-out ${
                    adversaryMode === m
                      ? "bg-accent text-accent-fg"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  {m === "coach" ? "Coach" : "Spar"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-small text-muted">
              {adversaryMode === "coach"
                ? "Coach is on your side. It asks what you actually think until you can say it."
                : "Spar is against you. It takes the strongest case for the other view."}
            </p>
          </div>
          {/* An editorial exchange, not a chat.
              This was alternating bubbles — `self-end` amber against
              `self-start` bordered — which DESIGN.md §10 and §21 both rule out,
              and which made an argument about your own thinking look like a
              support widget. Turns are now rule-separated, the speaker is named
              in the margin, and the two voices are set in different faces: your
              words in the editorial serif, the instrument's in the UI sans. */}
          <div ref={transcript} className="max-h-[55vh] min-h-32 overflow-y-auto overscroll-contain border-t border-line">
            {messages.length === 0 && (
              <p className="flex items-center gap-2 pt-4 text-small text-muted">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent" />
                Starting the conversation…
              </p>
            )}
            {messages.map((m, i) => (
              <article
                key={m.id}
                // Blurs in on mount rather than snapping into place. Keyed by
                // message id, so it plays once per turn and not per token.
                className={`ce-stream-in grid gap-x-8 gap-y-1 py-4 sm:grid-cols-[5rem_1fr] ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <p
                  className={`font-mono text-micro uppercase tracking-eyebrow ${
                    m.role === "user" ? "text-accent" : "text-muted"
                  }`}
                >
                  {m.role === "user" ? "You" : adversaryMode === "coach" ? "Coach" : "Spar"}
                </p>
                {m.role === "user" ? (
                  <p className="ce-measure font-serif leading-relaxed text-fg">{msgText(m)}</p>
                ) : (
                  <div className="ce-measure text-small leading-relaxed text-muted">
                    <Markdown>{msgText(m)}</Markdown>
                    {streaming && m.id === messages[messages.length - 1]?.id && (
                      <span className="ml-0.5 inline-block h-3.5 w-[3px] animate-pulse rounded-control bg-accent align-middle" />
                    )}
                  </div>
                )}
              </article>
            ))}
            {awaiting && (
              <div className="grid gap-x-8 py-4 sm:grid-cols-[5rem_1fr]">
                <p className="font-mono text-micro uppercase tracking-eyebrow text-muted">
                  {adversaryMode === "coach" ? "Coach" : "Spar"}
                </p>
                <ProgressSteps steps={ADVERSARY_THINKING_STEPS} />
              </div>
            )}
            {chatError && (
              <p className="border-l-2 border-warning/50 bg-warning/5 py-3 pl-4 text-small text-warning">
                Your sparring partner hit an error: {chatError.message}. Try sending again.
              </p>
            )}
          </div>

          {(streaming || (!thinking && messages.some((m) => m.role === "assistant"))) && (
            <div className="mt-2 flex items-center gap-2">
              {streaming ? (
                <Button size="sm" variant="ghost" onClick={() => stop()}>
                  <Square className="h-3 w-3" /> Stop
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={copyLastReply}>
                  <Copy className="h-3 w-3" /> Copy reply
                </Button>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void getHints()}
              disabled={hinting || thinking || messages.length === 0}
              className="inline-flex items-center gap-1.5 rounded-control border border-cool/40 bg-cool/10 px-3 py-1.5 text-small font-medium text-cool transition duration-(--dur-fast) ease-out hover:bg-cool/20 disabled:opacity-50"
              title="Suggest angles to help you answer — in your own words"
            >
              <Lightbulb className="h-3.5 w-3.5" /> {hinting ? "Thinking…" : "Stuck? Get hints"}
            </button>
            {hints.map((h, i) => (
              <button
                key={i}
                onClick={() => setChatInput(h)}
                className="rounded-full border border-line px-3 py-1 text-small text-muted transition duration-(--dur-fast) ease-out hover:bg-surface hover:text-fg"
                title="Use as a starting point — edit it in your words"
              >
                {h}
              </button>
            ))}
            {/* The stems sit beside a button that spends a model call and takes
                a few seconds; they cost nothing and fill the box instantly. Same
                row, opposite consequence, so the row says which is which. */}
            {hints.length === 0 && !thinking && messages.some((m) => m.role === "assistant") && (
              <span className="ml-1 text-small text-muted">Start a reply:</span>
            )}
            {hints.length === 0 &&
              !thinking &&
              messages.some((m) => m.role === "assistant") &&
              FOLLOWUPS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setChatInput(f.text)}
                  className="rounded-full border border-line px-3 py-1 text-small text-muted transition duration-(--dur-fast) ease-out hover:bg-surface hover:text-fg"
                  title="Start your reply — then finish it in your own words"
                >
                  {f.label}
                </button>
              ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim()) {
                sendTurn(chatInput);
                setChatInput("");
                setHints([]);
              }
            }}
            className="mt-3 flex gap-2"
          >
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Defend, revise, or push back…"
              className="flex-1"
            />
            <Button type="submit" disabled={thinking || !chatInput.trim()}>
              Send
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="ce-measure text-small text-muted">
              It won&rsquo;t hand you a conclusion — it helps you shape your own. Done whenever you&rsquo;re ready.
            </p>
            <Button
              variant="primary"
              onClick={finishConversation}
              loading={suggesting}
              loadingLabel="Writing it up…"
              className="shrink-0"
            >
              Write up my take →
            </Button>
          </div>
        </div>
      )}

      {/* The stamp. Saving a take is the point of the whole flow and it used to
          be acknowledged by a toast sliding into a corner. */}
      {stamped && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm" role="status">
          <div className="ce-stamp rounded-surface border-2 border-accent bg-ink px-8 py-6 text-center shadow-[6px_6px_0_0_var(--color-accent)]">
            <p className="font-mono text-micro uppercase tracking-eyebrow text-accent">Saved</p>
            <p className="mt-2 font-serif text-title font-semibold">
              <Underline draw>That&rsquo;s your take.</Underline>
            </p>
            <p className="mt-3 text-micro text-muted">It&rsquo;s in your Ledger now.</p>
          </div>
        </div>
      )}

      {step === "commit" && (
        <div className="ce-fade-up">
          {/* The take, on paper — the same material, face and size it had on the
              step before, so this reads as the sentence being carried forward
              and sharpened rather than as a second, different question. */}
          <Plate className="p-6 sm:p-8">
            <PlateLabel>Your crux</PlateLabel>
            <label htmlFor="final-take" className="mt-1 block text-small text-paper-muted">
              Carried over from what you wrote — edit it until it says exactly what you believe.
            </label>
            <div className="mt-4">
              <TakeField
                id="final-take"
                value={statement}
                onChange={setStatement}
                placeholder="The one sentence you'd defend."
              />
            </div>
          </Plate>

          {/* Confidence, as the forecast it actually is.
              These three words are scored as 0.3 / 0.6 / 0.85 in
              lib/ledger-stats and a Brier score is computed against them — so
              the user was making a probabilistic claim, and being marked on it,
              while the number sat at 11px under a capitalised word. §12: the
              numeral leads, `CONFIDENCE` labels it, and it is a row of rules
              rather than three more bordered pills. */}
          <Section label="Confidence" className="mt-8" labelClassName="text-accent">
            <div className="flex border-t border-line">
              {(["low", "med", "high"] as Confidence[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setConfidence(c)}
                  aria-pressed={confidence === c}
                  aria-label={`${Math.round(CONF_P[c] * 100)} percent — ${CONF_LABEL[c]}`}
                  className={`ce-press flex-1 border-r border-line px-4 py-4 text-left transition duration-(--dur-fast) ease-out last:border-r-0 ${
                    confidence === c ? "bg-accent/5" : "hover:bg-surface"
                  }`}
                >
                  <span
                    className={`ce-tabular block font-serif text-title font-semibold leading-none ${
                      confidence === c ? "text-accent" : "text-muted"
                    }`}
                  >
                    {Math.round(CONF_P[c] * 100)}%
                  </span>
                  <span
                    className={`mt-2 block font-mono text-micro uppercase tracking-eyebrow ${
                      confidence === c ? "text-fg" : "text-muted"
                    }`}
                  >
                    {CONF_LABEL[c]}
                  </span>
                </button>
              ))}
            </div>
            <p className="ce-measure mt-3 text-small text-muted">{CONF_MEANING[confidence]}</p>
          </Section>

          <Section label="The rest of the record" className="mt-8">
            <p className="ce-measure text-small text-muted">
              Optional, and worth it: a take with its evidence and its strongest counter is the one
              you can still defend in three months.{" "}
              <button
                onClick={draftFromDiscussion}
                disabled={suggesting}
                className="text-cool underline-offset-4 transition hover:underline disabled:opacity-50"
              >
                {suggesting ? "Organising…" : "Organise it from what I argued"}
              </button>
            </p>
            {showDepth ? (
              <div className="mt-4 space-y-4">
                <Field label="Key evidence for your view" value={evidenceFor} onChange={setEvidenceFor} />
                <Field label="The other side's best case" value={steelman} onChange={setSteelman} />
                <Field label="What would change your mind" value={changeMyMind} onChange={setChangeMyMind} />
                <Field label="Topic / tag" value={topic} onChange={setTopic} single />
              </div>
            ) : (
              <button
                onClick={() => setShowDepth(true)}
                className="mt-3 text-small text-muted underline-offset-4 hover:text-fg hover:underline"
              >
                + Add evidence, the other side, and what would change your mind
              </button>
            )}
          </Section>

          {/* The commit moment (§10: "should feel deliberate"). */}
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <Button
              variant="primary"
              onClick={commit}
              disabled={!statement.trim()}
              loading={loading}
              loadingLabel="Working…"
            >
              Save + make carousel →
            </Button>
            <Button
              onClick={commitOnly}
              disabled={loading || !statement.trim()}
              title="Save it to your Ledger without making a carousel"
            >
              Just save my take
            </Button>
          </div>

          {loading && <ProgressSteps steps={CAROUSEL_STEPS} />}
        </div>
      )}
    </div>
  );
}

/**
 * The take field, which grows to its content.
 *
 * At `text-title` a two-row box holds about twelve words; a real take is
 * twenty. A fixed `rows` clipped the user's own sentence behind the rule under
 * it — on the one element the whole screen was rebuilt to make the largest.
 * Height follows the value, so the field is always exactly as tall as what has
 * been written in it.
 */
function TakeField({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "rows" | "className"
>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      {...rest}
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      className="ce-measure w-full resize-none overflow-hidden border-0 border-b border-paper-fg/20 bg-transparent px-0 pb-2 font-serif text-title leading-tight text-paper-fg outline-none placeholder:text-paper-muted/70 focus:border-paper-fg/60"
    />
  );
}

function Field({
  label,
  value,
  onChange,
  single,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  single?: boolean;
}) {
  return (
    <div>
      <label className="block text-small font-medium">{label}</label>
      {single ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5" />
      ) : (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="mt-1.5" />
      )}
    </div>
  );
}
