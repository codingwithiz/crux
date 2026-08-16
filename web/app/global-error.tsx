"use client";

/**
 * The last resort: an error thrown by the root layout itself, before any of the
 * app's chrome exists.
 *
 * This one replaces the whole document, so it must supply its own <html> and
 * <body> — and it cannot rely on the stylesheet the layout would have loaded,
 * which is why the styles here are inline rather than themed. It should be
 * unreachable; when it isn't, it needs to work with nothing.
 */

/**
 * The tokens, copied because there is no stylesheet to read them from.
 *
 * These were approximations — #f0b429 for an accent that is #f4b740, #0b0b0c
 * for an ink that is #0a0b0e — so the one screen a user sees when everything
 * has gone wrong was also the one screen in a different brand. Copied exactly
 * and named, so the next person greps `--color-accent`, finds this, and updates
 * both. ponytail: two places, kept in sync by hand; a build-time export of the
 * theme would be the fix if this list ever grows.
 */
const T = {
  ink: "#0a0b0e", // --color-ink
  fg: "#f3f4f6", // --color-fg
  muted: "#9499a6", // --color-muted
  accent: "#f4b740", // --color-accent
  accentFg: "#1a1206", // --color-accent-fg
  radiusControl: "8px", // --radius-control
  title: "1.875rem", // --text-title
  small: "0.875rem", // --text-small
  micro: "0.6875rem", // --text-micro
} as const;
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: T.ink,
          color: T.fg,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <p style={{ fontSize: T.micro, letterSpacing: "0.08em", color: T.accent, margin: 0 }}>
            CRUX
          </p>
          <h1 style={{ fontSize: T.title, margin: "0.5rem 0 0", fontWeight: 600 }}>
            Crux failed to start.
          </h1>
          <p style={{ color: T.muted, lineHeight: 1.6 }}>
            Something went wrong before the app could load. Reloading usually fixes it; your saved
            work is stored separately and is unaffected.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.65rem 1.25rem",
              borderRadius: T.radiusControl,
              border: "none",
              background: T.accent,
              color: T.accentFg,
              fontWeight: 500,
              fontSize: T.small,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ marginTop: "2rem", fontFamily: "ui-monospace, monospace", fontSize: T.micro, color: T.muted, opacity: 0.7 }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
