/**
 * Publishing is a MANUAL HANDOFF: this opens the platform's composer and the
 * user attaches their downloaded slides. Real auto-publish needs approved
 * platform API access and a deployed OAuth callback — deliberately not built,
 * since it would save one person a thirty-second upload.
 */
export type Platform = "x" | "linkedin" | "instagram";

export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "x", label: "X / Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
];

/** Opens the platform's web composer; the user pastes the caption + slides. */
export const manualPublisher = {
  id: "manual",
  label: "Manual handoff",
  publish({ platform, caption }: { platform: Platform; caption: string }): { ok: boolean; message: string } {
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
