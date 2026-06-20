/**
 * Pluggable publishing. The default is a MANUAL HANDOFF — it opens the platform
 * composer and the user attaches their downloaded slides. True auto-publish to
 * X / LinkedIn / Instagram needs approved platform API access + a deployed
 * OAuth callback, so a live adapter is wired at deploy time behind this same
 * `Publisher` interface; nothing here assumes it exists.
 */
export type Platform = "x" | "linkedin" | "instagram";

export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "x", label: "X / Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
];

export interface PublishResult {
  ok: boolean;
  message: string;
}

export interface Publisher {
  id: string;
  label: string;
  publish(input: { platform: Platform; caption: string }): PublishResult;
}

/** Opens the platform's web composer; the user pastes the caption + slides. */
export const manualPublisher: Publisher = {
  id: "manual",
  label: "Manual handoff",
  publish({ platform, caption }) {
    if (typeof window === "undefined") return { ok: false, message: "No window." };
    if (platform === "x") {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`,
        "_blank",
        "noopener,noreferrer",
      );
      return { ok: true, message: "Opened X — attach your downloaded slides." };
    }
    if (platform === "linkedin") {
      window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank", "noopener,noreferrer");
      return { ok: true, message: "Opened LinkedIn — paste the caption and add your slides." };
    }
    return { ok: true, message: "Instagram has no web composer — post the downloaded slides from the app." };
  },
};
