"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { getSettings, saveSettings, TIERS, PROVIDER_SHORT } from "@/lib/settings";
import type { Provider, Settings, Tier } from "@/lib/types";

interface ProviderStatus {
  /** Providers this deployment can actually reach. */
  available?: Provider[];
}

/**
 * One question: how much thinking do you want?
 *
 * This used to ask three — provider, then model id, then whether to upgrade
 * "the Adversary" — none of which a user can answer without reading the source.
 * It also listed providers with no key configured, so a reasonable-looking
 * choice broke every generation afterwards. The provider is now chosen
 * server-side from what actually works, and is never named as an option here.
 */
export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<Tier>("balanced");
  const [status, setStatus] = useState<ProviderStatus | null>(null);

  // localStorage again: read after hydration so the first paint matches the
  // server's.
  /* eslint-disable react-hooks/set-state-in-effect -- see note above */
  useEffect(() => {
    setTier(getSettings().tier ?? "balanced");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((j: ProviderStatus) => setStatus(j))
      .catch(() => setStatus(null));
  }, [open]);

  const ready = (status?.available?.length ?? 0) > 0;
  const runningOn = status?.available?.[0];
  const label = TIERS.find((t) => t.id === tier)?.label ?? "Balanced";

  function choose(next: Tier) {
    setTier(next);
    saveSettings({ ...getSettings(), tier: next } satisfies Settings);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        // The visible text is the current tier, which alone doesn't say what it
        // controls — so the accessible name carries the subject as well.
        aria-label={`Thinking depth: ${label}`}
        className="ml-1 rounded-control border border-line px-3 py-1.5 text-sm text-fg transition hover:bg-surface"
      >
        <span
          className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${ready ? "bg-success" : "bg-accent"}`}
        />
        {label}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="How much thinking?">
        <div className="border-b border-line p-5">
          <h2 className="text-lg font-semibold">How much thinking?</h2>
          <p className="mt-1 text-sm text-muted">
            Applies to reading a source, arguing with you, and writing the carousel.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-2">
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => choose(t.id)}
                aria-pressed={tier === t.id}
                className={`flex w-full flex-col items-start rounded-control border px-4 py-3 text-left transition ${
                  tier === t.id ? "border-accent bg-accent/5" : "border-line hover:bg-surface"
                }`}
              >
                <span className="font-medium text-fg">{t.label}</span>
                <span className="mt-0.5 text-sm text-muted">{t.blurb}</span>
              </button>
            ))}
          </div>

          <p className="mt-4 rounded-control border border-line bg-ink/40 p-3 text-xs text-muted">
            {ready ? (
              <>
                Runs on this deployment&rsquo;s own key
                {runningOn ? ` (${PROVIDER_SHORT[runningOn]})` : ""} — nothing to set up.
              </>
            ) : (
              <>No model key is configured on the server yet, so generation won&rsquo;t run.</>
            )}
          </p>
        </div>

        <div className="flex justify-end border-t border-line p-4">
          <button
            onClick={() => setOpen(false)}
            className="rounded-control px-4 py-2 text-sm text-muted hover:text-fg"
          >
            Close
          </button>
        </div>
      </Dialog>
    </>
  );
}
