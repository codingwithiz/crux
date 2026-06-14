"use client";

import { useEffect, useState } from "react";
import {
  getSettings,
  saveSettings,
  settingsReady,
  DEFAULT_MODELS,
  PROVIDER_LABELS,
} from "@/lib/settings";
import type { Provider, Settings } from "@/lib/types";

const PROVIDERS: Provider[] = ["google", "ollama", "anthropic", "openai"];

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Settings>({ provider: "google", model: DEFAULT_MODELS.google });
  const [ready, setReady] = useState(true);

  useEffect(() => {
    const cur = getSettings();
    setS(cur);
    setReady(settingsReady(cur));
  }, [open]);

  function update(patch: Partial<Settings>) {
    setS((prev) => {
      const next = { ...prev, ...patch };
      if (patch.provider && patch.model === undefined) next.model = DEFAULT_MODELS[patch.provider];
      return next;
    });
  }

  function save() {
    saveSettings(s);
    setReady(settingsReady(s));
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-1 rounded-md border border-line px-3 py-1.5 text-sm text-fg transition hover:bg-surface"
      >
        <span
          className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${ready ? "bg-emerald-400" : "bg-accent"}`}
        />
        Model
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="ce-fade-up w-full max-w-md rounded-xl border border-line bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Model settings</h2>
            <p className="mt-1 text-sm text-muted">
              Free by default. Bring your own key for a sharper adversary. Stored only in your browser.
            </p>

            <label className="mt-4 block text-sm font-medium">Provider</label>
            <select
              value={s.provider}
              onChange={(e) => update({ provider: e.target.value as Provider })}
              className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-sm font-medium">Model</label>
            <input
              value={s.model ?? ""}
              onChange={(e) => update({ model: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm"
            />

            {s.provider !== "ollama" ? (
              <>
                <label className="mt-3 block text-sm font-medium">
                  API key{" "}
                  {s.provider === "google" && (
                    <span className="font-normal text-muted">— free from Google AI Studio</span>
                  )}
                </label>
                <input
                  type="password"
                  value={s.apiKey ?? ""}
                  onChange={(e) => update({ apiKey: e.target.value })}
                  placeholder="AIza… / sk-…"
                  className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm"
                />
              </>
            ) : (
              <>
                <label className="mt-3 block text-sm font-medium">Ollama base URL</label>
                <input
                  value={s.ollamaBaseURL ?? "http://localhost:11434/v1"}
                  onChange={(e) => update({ ollamaBaseURL: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm"
                />
              </>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-muted hover:text-fg"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110"
              >
                Save
              </button>
            </div>

            {s.provider === "google" && (
              <p className="mt-3 text-xs text-muted">
                Get a free key at aistudio.google.com/app/apikey — 1,500 requests/day, no card.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
