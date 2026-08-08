"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { getSettings, SETTINGS_EVENT, PROVIDER_SHORT, DEFAULT_MODELS } from "@/lib/settings";
import { stepModelSettings, type Step as ModelStep } from "@/lib/ai/routing";
import { addThesis, removeThesis } from "@/lib/ledger";
import { expressSlides, explainerFromSynthesis } from "@/lib/express-client";
import { saveDraft } from "@/lib/draft";
import { getBrandKit } from "@/lib/brand-kit";
import { INSPIRATION } from "@/lib/inspiration";
import { findRelated, type RelatedThesis } from "@/lib/related";
import { asCitations } from "@/lib/citations";
import { parseInput } from "@/lib/parse-input";
import { saveFlow, loadFlow, clearFlow, flowMatches } from "@/lib/flow-session";
import { Markdown } from "./Markdown";
import { ProgressSteps } from "./ProgressSteps";
import { MicButton } from "./MicButton";
import { Check, AlertTriangle, Lightbulb, Sparkles, Copy, ExternalLink, Square, BookOpen } from "lucide-react";
import { toast } from "sonner";
import type { Confidence, Settings, Synthesis, Thesis } from "@/lib/types";

type Step = "input" | "synth" | "adversary" | "commit";

const STEPS: { id: Step; label: string }[] = [
  { id: "input", label: "Input" },
  { id: "synth", label: "Synthesize" },
  { id: "adversary", label: "Discuss" },
  { id: "commit", label: "Commit" },
];

const STEP_WHY: Record<Step, string> = {
  input: "Start from your own rough opinion — one sentence is enough.",
  synth: "We read the real source and break it down. Then write your gut take.",
  adversary: "Optional: talk it through. Coach helps you find your take; Spar stress-tests it. It never writes it for you.",
  commit: "Lock in your view — it becomes a carousel in your voice.",
};

// Stable arrays (module scope) so ProgressSteps doesn't get a new reference on
// every parent render — important during the high-churn streaming step.
const SYNTH_STEPS_NEWS = ["Fetching the source", "Reading the article", "Finding the key debate", "Writing your questions"];
const SYNTH_STEPS_THOUGHT = ["Reading your thought", "Finding the key debate", "Writing your questions"];
const ADVERSARY_THINKING_STEPS = ["Reading your point", "Steelmanning the other side", "Finding the hard question"];

// Instant reply-starters (anti-slop: they prefill a stem the user finishes).
const FOLLOWUPS = [
  { label: "Push back", text: "I push back: " },
  { label: "Concede + refine", text: "Fair point. I'd refine my take to: " },
  { label: "My evidence", text: "My evidence is: " },
];

const SYNTH_ROWS: { key: keyof Synthesis; label: string }[] = [
  { key: "happened", label: "What happened" },
  { key: "newVsRepackaged", label: "New vs. repackaged" },
  { key: "keyDebate", label: "The key debate" },
  { key: "skepticCase", label: "The skeptic's case" },
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
  const [related, setRelated] = useState<RelatedThesis[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [parking, setParking] = useState(false);
  /** Set when this flow was resumed from a parked draft (see parkSynthesis). */
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
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

  // Human-readable "which model runs which step" summary.
  function modelLabel(stepKind: ModelStep): string {
    const ms = stepModelSettings(settings ?? undefined, stepKind);
    const p = ms.provider ?? "openai";
    return `${PROVIDER_SHORT[p]} · ${ms.model ?? DEFAULT_MODELS[p]}`;
  }

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
            ? "No model key found — add one in the Model menu (top-right)."
            : j.error || "Synthesis failed",
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
      synthesis,
      messages,
      commit: { statement, confidence, evidenceFor, steelman, changeMyMind, topic },
      savedAt: new Date().toISOString(),
    });
  }, [
    mode, sourceTitle, step, input, take, draftId, synthesis, messages,
    statement, confidence, evidenceFor, steelman, changeMyMind, topic,
  ]);

  function startOver() {
    clearFlow();
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
      const { slides, designId } = await explainerFromSynthesis(synthesis, sourceTitle, sourceUrl, handle);
      saveDraft({ slides, handle, designId });
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
        id: draftId ?? crypto.randomUUID(),
        topic: topic.trim() || sourceTitle || input.trim().slice(0, 80) || "Parked",
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

  async function commit() {
    setLoading(true);
    setError(null);
    const thesis: Thesis = {
      id: crypto.randomUUID(),
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

    const handle = getBrandKit().handle;
    const { slides, designId } = await expressSlides(thesis, handle);
    saveDraft({ slides, handle, designId });
    clearFlow();
    router.push("/studio");
  }

  const activeIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div>
      {/* progress */}
      <div className="mb-6 flex items-center gap-2 text-xs">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-1 font-mono ${
                i === activeIdx
                  ? "bg-accent text-accent-fg"
                  : i < activeIdx
                    ? "bg-surface text-fg"
                    : "bg-surface/50 text-muted"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-muted">→</span>}
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-lg border border-line bg-surface/30 px-4 py-2.5">
        <p className="text-sm font-medium text-fg">
          Step {activeIdx + 1} of {STEPS.length} · {STEPS[activeIdx].label}
        </p>
        <p className="mt-0.5 text-xs text-muted">{STEP_WHY[step]}</p>
        <p className="mt-1.5 text-[11px] text-muted">
          Models — Synthesize · Carousel: <span className="text-fg/80">{modelLabel("synthesize")}</span>
          {" · "}Adversary: <span className="text-fg/80">{modelLabel("adversary")}</span>
          {" · "}change in the Model menu
        </p>
      </div>

      {resumed && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-cool/40 bg-cool/10 px-4 py-2.5 text-sm text-cool">
          <span>Resumed your in-progress conviction.</span>
          <button onClick={startOver} className="rounded-md px-2 py-1 text-xs underline-offset-4 hover:underline">
            Start over
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      )}

      {step === "input" && (
        <div className="ce-fade-up">
          <label className="block text-sm font-medium">A thought, a link, or both</label>
          <p className="mt-1 text-xs text-muted">
            Paste a link and we read the actual page before synthesizing. Add your own take alongside it
            and we keep them apart.
          </p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder="e.g. AI agents will make most SaaS dashboards obsolete within two years.&#10;or: https://example.com/article — I think the author is too optimistic."
            className="mt-2 w-full resize-none rounded-xl border border-line bg-surface/40 px-4 py-3 text-base outline-none focus:border-accent"
          />
          <div className="mt-2">
            <MicButton onText={(t) => setInput((p) => (p ? `${p} ${t}` : t))} />
          </div>
          <button
            onClick={() => runSynthesis(input)}
            disabled={loading || !input.trim()}
            className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Synthesizing…" : "Synthesize →"}
          </button>

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs text-muted">Blank page? Start from a spark — then make it your own:</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {INSPIRATION.slice(0, 6).map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-cool/50 hover:bg-surface hover:text-fg"
                  title="Use as a starting point — edit it into your own words"
                >
                  {s.length > 52 ? s.slice(0, 50) + "…" : s}
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
              {/* Shown on every path, not just the news feed. Gating this on
                  mode === "news" was what let a pasted link produce a confident
                  summary of a page nobody fetched, with no warning at all. */}
              <div className="mb-3 flex items-center gap-2 text-xs">
                {synthesis.grounded ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300">
                    <Check className="h-3 w-3" /> Grounded in the source
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-200">
                    <AlertTriangle className="h-3 w-3" /> From the model&rsquo;s knowledge — verify before you commit
                  </span>
                )}
                {(synthesis.source?.url ?? sourceUrl) && (
                  <a
                    href={synthesis.source?.url ?? sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-muted underline-offset-4 hover:text-fg hover:underline"
                  >
                    open source <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="space-y-3">
                {synthesis.plainEnglish && (
                  <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                    <p className="font-mono text-xs uppercase tracking-wide text-accent">
                      In plain English
                    </p>
                    <p className="mt-1 text-base leading-relaxed text-fg">{synthesis.plainEnglish}</p>
                  </div>
                )}
                {SYNTH_ROWS.map((r) => (
                  <div key={r.key} className="rounded-xl border border-line bg-surface/40 p-4">
                    <p className="font-mono text-xs uppercase tracking-wide text-accent">{r.label}</p>
                    <p className="mt-1 text-sm text-fg">{synthesis[r.key] as string}</p>
                  </div>
                ))}
                {synthesis.questions?.length > 0 && (
                  <div className="rounded-xl border border-line bg-surface/40 p-4">
                    <p className="font-mono text-xs uppercase tracking-wide text-accent">
                      Answer these before you have an opinion
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                      {synthesis.questions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {citations.length > 0 && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <p className="font-mono text-xs uppercase tracking-wide text-emerald-300">
                      Receipts — quotes from the source
                    </p>
                    <ul className="mt-2 space-y-2">
                      {citations.map((c, i) => (
                        <li key={i} className="border-l-2 border-emerald-500/40 pl-3 text-sm italic text-muted">
                          &ldquo;{c.quote}&rdquo;
                          {c.verified ? (
                            <span
                              title="Found word-for-word in the source"
                              className="ml-2 not-italic text-xs text-emerald-300"
                            >
                              <Check className="inline h-3 w-3" /> verified
                            </span>
                          ) : (
                            <span
                              title="We could not match this quote to the source text — treat it with suspicion"
                              className="ml-2 not-italic text-xs text-amber-300"
                            >
                              <AlertTriangle className="inline h-3 w-3" /> unverified
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {related.length > 0 && (
                <div className="mt-4 rounded-xl border border-cool/40 bg-cool/5 p-4">
                  <p className="font-mono text-xs uppercase tracking-wide text-cool">
                    Related to your past thinking
                  </p>
                  <ul className="mt-2 space-y-2">
                    {related.map((r) => (
                      <li key={r.id} className="text-sm text-fg">
                        {r.statement}
                        <span className="ml-2 text-xs text-muted">({r.confidence})</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted">Does today change any of these?</p>
                </div>
              )}

              <div className="mt-6 rounded-xl border border-cool/40 bg-cool/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Just want to explain it?</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Skip the opinion — make a neutral explainer carousel with the key takeaways for your audience.
                    </p>
                  </div>
                  <button
                    onClick={() => void makeExplainer()}
                    disabled={explaining}
                    className="ce-press inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cool/15 px-4 py-2 text-sm font-medium text-cool ring-1 ring-cool/40 transition hover:bg-cool/25 disabled:opacity-50"
                  >
                    <BookOpen className="h-4 w-4" /> {explaining ? "Building…" : "Make explainer carousel →"}
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-line bg-surface/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">No opinion yet?</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Park it with the source and receipts intact. Pick it up from Today whenever the take arrives.
                    </p>
                  </div>
                  <button
                    onClick={() => void parkSynthesis()}
                    disabled={parking}
                    className="ce-press inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface hover:text-fg disabled:opacity-50"
                  >
                    <BookOpen className="h-4 w-4" /> {parking ? "Saving…" : "Save for later"}
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-4">
                <label className="block text-sm font-medium">
                  Or — form <span className="text-accent">your</span> own take (one sentence)
                </label>
                <input
                  value={take}
                  onChange={(e) => setTake(e.target.value)}
                  placeholder="Write your gut take. The Adversary will pressure-test it."
                  className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <div className="mt-2">
                  <MicButton onText={(t) => setTake((p) => (p ? `${p} ${t}` : t))} />
                </div>

                <div className="mt-2">
                  <button
                    onClick={() => void getDrafts()}
                    disabled={draftsLoading}
                    className="rounded-lg border border-cool/40 bg-cool/10 px-3 py-1.5 text-xs font-medium text-cool transition hover:bg-cool/20 disabled:opacity-50"
                    title="See 2-3 divergent draft takes to react to and edit"
                  >
                    {draftsLoading ? "Thinking…" : "Not sure? See draft takes"}
                  </button>
                  {drafts.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-[11px] text-muted">
                        Starting points, not the answer — pick one, make it yours, then defend it.
                      </p>
                      {drafts.map((d, i) => (
                        <button
                          key={i}
                          onClick={() => setTake(d)}
                          className="block w-full rounded-lg border border-line bg-ink/60 px-3 py-2 text-left text-sm text-fg transition hover:border-cool/50 hover:bg-surface"
                          title="Use as a starting point — then edit it into your own words"
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={startAdversary}
                    disabled={!take.trim()}
                    className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
                  >
                    Talk it through →
                  </button>
                  <button
                    onClick={goCommit}
                    disabled={!take.trim()}
                    className="rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:bg-surface hover:text-fg disabled:opacity-50"
                  >
                    Skip — make my take →
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {step === "adversary" && (
        <div className="ce-fade-up">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">Mode</span>
            {(["coach", "spar"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setAdversaryMode(m)}
                className={`rounded-full border px-3 py-1 transition ${adversaryMode === m ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"}`}
                title={m === "coach" ? "Supportive — helps you find your take" : "Tough — stress-tests your take"}
              >
                {m === "coach" ? "Coach" : "Spar"}
              </button>
            ))}
            <span className="text-muted">{adversaryMode === "coach" ? "· gentle, helps you find it" : "· tough, stress-tests it"}</span>
          </div>
          <div className="flex min-h-[320px] flex-col gap-3 rounded-xl border border-line bg-surface/40 p-4">
            {messages.length === 0 && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent" />
                Starting the conversation…
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "self-end bg-accent/15 text-fg"
                    : "self-start border border-line bg-ink text-fg"
                }`}
              >
                {m.role === "user" ? (
                  msgText(m)
                ) : (
                  <>
                    <Markdown>{msgText(m)}</Markdown>
                    {streaming && m.id === messages[messages.length - 1]?.id && (
                      <span className="ml-0.5 inline-block h-3.5 w-[3px] animate-pulse rounded-sm bg-accent align-middle" />
                    )}
                  </>
                )}
              </div>
            ))}
            {awaiting && (
              <div className="self-start rounded-2xl border border-line bg-ink px-4 py-2.5">
                <ProgressSteps steps={ADVERSARY_THINKING_STEPS} />
              </div>
            )}
            {chatError && (
              <div className="self-start rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
                The Adversary hit an error: {chatError.message}. Check your model key in the Model
                menu, then send again.
              </div>
            )}
          </div>

          {(streaming || (!thinking && messages.some((m) => m.role === "assistant"))) && (
            <div className="mt-2 flex items-center gap-2">
              {streaming ? (
                <button
                  onClick={() => stop()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:bg-surface hover:text-fg"
                >
                  <Square className="h-3 w-3" /> Stop
                </button>
              ) : (
                <button
                  onClick={copyLastReply}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:bg-surface hover:text-fg"
                >
                  <Copy className="h-3 w-3" /> Copy reply
                </button>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void getHints()}
              disabled={hinting || thinking || messages.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cool/40 bg-cool/10 px-3 py-1.5 text-xs font-medium text-cool transition hover:bg-cool/20 disabled:opacity-50"
              title="Suggest angles to help you answer — in your own words"
            >
              <Lightbulb className="h-3.5 w-3.5" /> {hinting ? "Thinking…" : "Stuck? Get hints"}
            </button>
            {hints.map((h, i) => (
              <button
                key={i}
                onClick={() => setChatInput(h)}
                className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:bg-surface hover:text-fg"
                title="Use as a starting point — edit it in your words"
              >
                {h}
              </button>
            ))}
            {hints.length === 0 &&
              !thinking &&
              messages.some((m) => m.role === "assistant") &&
              FOLLOWUPS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setChatInput(f.text)}
                  className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:bg-surface hover:text-fg"
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
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Defend, revise, or push back…"
              className="flex-1 rounded-lg border border-line bg-surface/40 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={thinking || !chatInput.trim()}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface disabled:opacity-50"
            >
              Send
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              It won&rsquo;t hand you a conclusion — it helps you shape your own. Done whenever you&rsquo;re ready.
            </p>
            <button
              onClick={finishConversation}
              disabled={suggesting}
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
            >
              {suggesting ? "Compiling…" : "Compile my take →"}
            </button>
          </div>
        </div>
      )}

      {step === "commit" && (
        <div className="ce-fade-up space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cool/30 bg-cool/5 px-4 py-2.5">
            <p className="text-xs text-muted">
              Only <span className="text-fg">your thesis</span> and{" "}
              <span className="text-fg">confidence</span> are required. Let AI organize the rest from
              what you argued?
            </p>
            <button
              onClick={draftFromDiscussion}
              disabled={suggesting}
              className="shrink-0 rounded-lg bg-cool/15 px-3 py-1.5 text-xs font-medium text-cool ring-1 ring-cool/40 transition hover:bg-cool/25 disabled:opacity-50"
            >
              {suggesting ? "Drafting…" : <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Draft from my discussion</span>}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Your committed thesis <span className="text-accent">*</span> (1-2 sentences)
            </label>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-line bg-surface/40 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Confidence <span className="text-accent">*</span>
            </label>
            <div className="mt-2 flex gap-2">
              {(["low", "med", "high"] as Confidence[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setConfidence(c)}
                  className={`rounded-lg border px-4 py-1.5 text-sm capitalize ${
                    confidence === c ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {showDepth ? (
            <div className="space-y-4 border-t border-line pt-4">
              <Field label="Key evidence for your view" value={evidenceFor} onChange={setEvidenceFor} />
              <Field label="The strongest counter you accept (steelman)" value={steelman} onChange={setSteelman} />
              <Field label="What would change your mind" value={changeMyMind} onChange={setChangeMyMind} />
              <Field label="Topic / tag" value={topic} onChange={setTopic} single />
            </div>
          ) : (
            <button
              onClick={() => setShowDepth(true)}
              className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              + Add depth (evidence, steelman, change-trigger) — optional
            </button>
          )}

          <button
            onClick={commit}
            disabled={loading || !statement.trim()}
            className="block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Building carousel…" : "Commit + make carousel →"}
          </button>
        </div>
      )}
    </div>
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
      <label className="block text-sm font-medium">{label}</label>
      {single ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-surface/40 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="mt-1 w-full resize-none rounded-lg border border-line bg-surface/40 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      )}
    </div>
  );
}
