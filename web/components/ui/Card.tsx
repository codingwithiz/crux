import type { ReactNode } from "react";

type Tone = "default" | "accent" | "cool" | "muted";

/**
 * A panel.
 *
 * There were 24 distinct border/background/radius combinations doing this job,
 * with four different radii applied to the same conceptual card — sometimes
 * within one screen. Two radii and four tones cover every real use.
 */
const TONES: Record<Tone, string> = {
  default: "border-line bg-surface/40",
  accent: "border-accent/40 bg-accent/5",
  cool: "border-cool/40 bg-cool/5",
  muted: "border-line bg-ink/40",
};

export function Card({
  tone = "default",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return <div className={`rounded-xl border p-4 ${TONES[tone]} ${className}`}>{children}</div>;
}
