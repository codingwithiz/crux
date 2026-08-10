"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * The page-level catch-all.
 *
 * Without it, a render error anywhere in the app showed Next's default screen —
 * a stack trace in development and a blank frame in production, with no way back
 * and nothing to quote when reporting it. `digest` is the id Next assigns to the
 * server-side error, and it's the only thing that ties this screen to a log line.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-start px-5 py-24">
      <p className="font-mono text-xs uppercase tracking-wide text-accent">Something broke</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
        That didn&rsquo;t work.
      </h1>
      <p className="mt-3 text-muted">
        The page hit an error it couldn&rsquo;t recover from. Your saved takes and carousels are
        untouched — nothing here writes to them.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={reset}
          className="ce-press rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110"
        >
          Try again
        </button>
        <Link href="/today" className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
          Back to Today
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 font-mono text-xs text-muted">
          Reference: <span className="text-fg">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
