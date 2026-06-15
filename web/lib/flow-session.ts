import type { UIMessage } from "ai";
import type { Confidence, Synthesis } from "./types";

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
