import type { UIMessage } from "ai";
import type { Confidence, Synthesis, Thesis } from "./types";

/**
 * A snapshot of an in-progress conviction. We persist this to localStorage on
 * every step so a refresh or crash mid-flow (especially during the Adversary
 * dialogue) resumes exactly where you were — the pragmatic, free version of the
 * plan's "durable, resume-after-human" pipeline for an on-demand app.
 */
export interface FlowSession {
  mode: "thought" | "news";
  sourceTitle?: string;
  step: string;
  input: string;
  take: string;
  /**
   * Set when this flow was resumed from a parked draft, so committing an
   * opinion can retire the draft instead of leaving a duplicate behind.
   */
  draftId?: string;
  synthesis: Synthesis | null;
  messages: UIMessage[];
  commit: {
    statement: string;
    confidence: Confidence;
    evidenceFor: string;
    steelman: string;
    changeMyMind: string;
    topic: string;
  };
  savedAt: string;
}

const KEY = "ce.flow";

export function saveFlow(s: FlowSession): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export function loadFlow(): FlowSession | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FlowSession) : null;
  } catch {
    return null;
  }
}

export function clearFlow(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Reopen a parked draft as an in-progress flow. Parking and resuming ride on
 * the existing session machinery rather than a second restore path: write the
 * session, then navigate to /think and let ConvictionFlow's mount-restore do
 * the rest. `draftId` travels along so committing can retire the placeholder.
 */
export function parkedToFlow(t: Thesis): FlowSession {
  return {
    mode: "thought",
    step: "synth",
    input: t.topic,
    take: "",
    draftId: t.id,
    synthesis: t.synthesis ?? null,
    messages: [],
    commit: {
      statement: "",
      confidence: t.confidence,
      evidenceFor: "",
      steelman: "",
      changeMyMind: "",
      topic: t.topic,
    },
    savedAt: new Date().toISOString(),
  };
}

/** Is this saved session the same flow we're now opening, and does it have real progress worth restoring? */
export function flowMatches(
  s: FlowSession | null,
  mode: "thought" | "news",
  sourceTitle?: string,
): s is FlowSession {
  if (!s || s.mode !== mode) return false;
  if (mode === "news" && (s.sourceTitle ?? "") !== (sourceTitle ?? "")) return false;
  return s.step !== "input" || Boolean(s.synthesis) || s.input.trim().length > 0;
}
