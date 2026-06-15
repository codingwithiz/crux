"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { nanoid } from "nanoid";
import { getSettings, SETTINGS_EVENT, PROVIDER_SHORT, DEFAULT_MODELS } from "@/lib/settings";
import { stepModelSettings, type Step as ModelStep } from "@/lib/ai/routing";
import { addThesis } from "@/lib/ledger";
import { expressSlides } from "@/lib/express-client";
import { saveDraft } from "@/lib/draft";
import { findRelated, type RelatedThesis } from "@/lib/related";
import { saveFlow, loadFlow, clearFlow, flowMatches } from "@/lib/flow-session";
import type { Confidence, Settings, Synthesis, Thesis } from "@/lib/types";

type Step = "input" | "synth" | "adversary" | "commit";

const STEPS: { id: Step; label: string }[] = [
  { id: "input", label: "Input" },
  { id: "synth", label: "Synthesize" },
  { id: "adversary", label: "Adversary" },
  { id: "commit", label: "Commit" },
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
  const [related, setRelated] = useState<RelatedThesis[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
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
    const p = ms.provider ?? "google";
    return `${PROVIDER_SHORT[p]} · ${ms.model ?? DEFAULT_MODELS[p]}`;
  }

  async function runSynthesis(text: string) {
    setError(null);
    const s = getSettings();
    setSettings(s);
    setLoading(true);
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: text,
          kind: mode === "news" ? "news" : "thought",
          sourceTitle,
          sourceUrl,
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
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/adversary", body: { synthesis, take, settings } }),
    [synthesis, take, settings],
  );
  const { messages, sendMessage, status, setMessages, error: chatError } = useChat({ transport });
  const [chatInput, setChatInput] = useState("");
  const seeded = useRef(false);
  const thinking = status === "submitted" || status === "streaming";

  function startAdversary() {
    setSettings(getSettings());
    setStep("adversary");
    if (!seeded.current && take.trim()) {
      seeded.current = true;
      sendMessage({ text: `My take: ${take}` });
    }
  }

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
      if (saved.messages?.length) setMessages(saved.messages);
      seeded.current = true;
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
      synthesis,
      messages,
      commit: { statement, confidence, evidenceFor, steelman, changeMyMind, topic },
      savedAt: new Date().toISOString(),
    });
  }, [
    mode, sourceTitle, step, input, take, synthesis, messages,
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

  async function commit() {
    setLoading(true);
    setError(null);
    const thesis: Thesis = {
      id: nanoid(),
      topic: topic.trim() || (mode === "news" ? sourceTitle ?? "AI" : "My take"),
      statement: statement.trim() || take.trim(),
      confidence,
      evidenceFor: evidenceFor.trim() || undefined,
      steelman: steelman.trim() || undefined,
      changeMyMind: changeMyMind.trim() || undefined,
      createdAt: new Date().toISOString(),
      source: sourceTitle ? { title: sourceTitle, url: sourceUrl } : undefined,
      status: "active",
    };
    await addThesis(thesis);

    const slides = await expressSlides(thesis, "@you");
    saveDraft({ slides, handle: "@you" });
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

      <p className="mb-4 text-[11px] text-muted">
        Models — Synthesize · Carousel: <span className="text-fg">{modelLabel("synthesize")}</span>{" "}
        · Adversary: <span className="text-fg">{modelLabel("adversary")}</span>{" "}
        <span className="text-muted">· change in the Model menu (top-right)</span>
      </p>

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
          <label className="block text-sm font-medium">Your raw thought</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder="e.g. AI agents will make most SaaS dashboards obsolete within two years."
            className="mt-2 w-full resize-none rounded-xl border border-line bg-surface/40 px-4 py-3 text-base outline-none focus:border-accent"
          />
          <button
            onClick={() => runSynthesis(input)}
            disabled={loading || !input.trim()}
            className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Synthesizing…" : "Synthesize →"}
          </button>
        </div>
      )}

      {step === "synth" && (
        <div className="ce-fade-up">
          {loading && !synthesis ? (
            <p className="text-muted">Synthesizing the landscape…</p>
          ) : synthesis ? (
            <>
              {mode === "news" && (
                <div className="mb-3 flex items-center gap-2 text-xs">
                  {synthesis.grounded ? (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300">
                      ✓ Grounded in the source
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-200">
                      ⚠ From the model&rsquo;s knowledge — verify before you commit
                    </span>
                  )}
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted underline-offset-4 hover:text-fg hover:underline"
                    >
                      open source ↗
                    </a>
                  )}
                </div>
              )}
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
                {synthesis.citations && synthesis.citations.length > 0 && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <p className="font-mono text-xs uppercase tracking-wide text-emerald-300">
                      Receipts — quotes from the source
                    </p>
                    <ul className="mt-2 space-y-2">
                      {synthesis.citations.map((c, i) => (
                        <li key={i} className="border-l-2 border-emerald-500/40 pl-3 text-sm italic text-muted">
                          &ldquo;{c}&rdquo;
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

              <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-4">
                <label className="block text-sm font-medium">
                  Now — what do <span className="text-accent">you</span> think? (one sentence)
                </label>
                <input
                  value={take}
                  onChange={(e) => setTake(e.target.value)}
                  placeholder="Write your gut take. The Adversary will pressure-test it."
                  className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  onClick={startAdversary}
                  disabled={!take.trim()}
                  className="mt-3 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
                >
                  Pressure-test this →
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {step === "adversary" && (
        <div className="ce-fade-up">
          <div className="flex min-h-[320px] flex-col gap-3 rounded-xl border border-line bg-surface/40 p-4">
            {messages.length === 0 && <p className="text-sm text-muted">Starting the interrogation…</p>}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "self-end bg-accent/15 text-fg"
                    : "self-start border border-line bg-ink text-fg"
                }`}
              >
                {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
              </div>
            ))}
            {thinking && (
              <div className="self-start rounded-2xl border border-line bg-ink px-4 py-2.5 text-sm text-muted">
                thinking…
              </div>
            )}
            {chatError && (
              <div className="self-start rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
                The Adversary hit an error: {chatError.message}. Check your model key in the Model
                menu, then send again.
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim()) {
                sendMessage({ text: chatInput });
                setChatInput("");
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

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted">
              The Adversary will not hand you a conclusion. Commit when your view is sharper.
            </p>
            <button
              onClick={goCommit}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110"
            >
              I am ready to commit →
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
              {suggesting ? "Drafting…" : "✶ Draft from my discussion"}
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
