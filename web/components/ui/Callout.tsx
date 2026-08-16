import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "danger";

/**
 * A bordered notice, in the tone the message actually is.
 *
 * The semantic colour tokens were defined in globals.css and referenced
 * nowhere — every component reached for a raw Tailwind palette value instead,
 * so "good" was one green here and a different green on the panel beside it,
 * and the four error banners in the app looked like four different products.
 */
const TONES: Record<Tone, string> = {
  info: "border-cool/40 bg-cool/10 text-cool",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
};

export function Callout({
  tone = "info",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-control border px-4 py-2.5 text-sm ${TONES[tone]} ${className}`}>
      {children}
    </div>
  );
}
