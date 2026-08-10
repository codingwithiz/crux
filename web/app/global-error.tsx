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
          background: "#0b0b0c",
          color: "#f5f5f4",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <p style={{ fontSize: "0.75rem", letterSpacing: "0.08em", color: "#f0b429", margin: 0 }}>
            CRUX
          </p>
          <h1 style={{ fontSize: "1.75rem", margin: "0.5rem 0 0", fontWeight: 600 }}>
            Crux failed to start.
          </h1>
          <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>
            Something went wrong before the app could load. Reloading usually fixes it; your saved
            work is stored separately and is unaffected.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.65rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#f0b429",
              color: "#1c1917",
              fontWeight: 500,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ marginTop: "2rem", fontFamily: "ui-monospace, monospace", fontSize: "0.75rem", color: "#71717a" }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
