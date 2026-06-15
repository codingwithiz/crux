"use client";

import { useEffect, useState } from "react";
import {
  getSettings,
  saveSettings,
  settingsReady,
  DEFAULT_MODELS,
  PROVIDER_LABELS,
  PROVIDER_SHORT,
  MODEL_PRESETS,
} from "@/lib/settings";
import type { Provider, Settings } from "@/lib/types";

const PROVIDERS: Provider[] = ["google", "ollama", "anthropic", "openai"];

interface ServerStatus {
  configured?: boolean;
  signedIn?: boolean;
  google?: boolean;
  openai?: boolean;
  anthropic?: boolean;
}

type CloudKey = "google" | "openai" | "anthropic";
const CLOUD_KEYABLE: CloudKey[] = ["google", "openai", "anthropic"];
const isCloudKey = (p?: Provider): p is CloudKey =>
  p === "google" || p === "openai" || p === "anthropic";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Settings>({ provider: "google", model: DEFAULT_MODELS.google });
  const [ready, setReady] = useState(true);
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [cloudMsg, setCloudMsg] = useState<string | null>(null);
  const [savingCloud, setSavingCloud] = useState(false);

  useEffect(() => {
    const cur = getSettings();
    setS(cur);
    setReady(settingsReady(cur));
    if (open) {
      setCloudMsg(null);
      fetch("/api/secrets")
        .then((r) => r.json())
        .then((j: ServerStatus) => setServer(j))
        .catch(() => setServer(null));
    }
  }, [open]);

  async function saveToAccount() {
    setSavingCloud(true);
    setCloudMsg(null);
    // Collect the keys the user has typed for cloud-storable providers.
    const body: Record<string, string> = {};
    if (isCloudKey(s.provider) && s.apiKey?.trim()) body[s.provider] = s.apiKey.trim();
    if (isCloudKey(s.adversaryProvider) && s.adversaryApiKey?.trim()) {
      body[s.adversaryProvider] = s.adversaryApiKey.trim();
    }
    if (Object.keys(body).length === 0) {
      setCloudMsg("Type a key above first, then save it to your account.");
      setSavingCloud(false);
      return;
    }
    try {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "save_failed");
      }
      const refreshed = (await fetch("/api/secrets").then((r) => r.json())) as ServerStatus;
      setServer(refreshed);
      setCloudMsg("Saved to your account — works on any device, even without re-entering keys.");
    } catch (e) {
      setCloudMsg(`Couldn't save: ${(e as Error).message}`);
    } finally {
      setSavingCloud(false);
    }
  }

  function update(patch: Partial<Settings>) {
    setS((prev) => {
      const next = { ...prev, ...patch };
      if (patch.provider && patch.model === undefined) next.model = DEFAULT_MODELS[patch.provider];
      if (patch.adversaryProvider !== undefined && patch.adversaryModel === undefined) {
        next.adversaryModel = patch.adversaryProvider
          ? DEFAULT_MODELS[patch.adversaryProvider]
          : undefined;
      }
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
              Free by default. Bring your own key for a sharper adversary. Kept in this browser — or
              save it to your account to sync across devices.
            </p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent">
              Default model — Synthesize · Curator · Carousel
            </p>
            <label className="mt-1 block text-sm font-medium">Provider</label>
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
              list="ce-model-presets"
              className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm"
            />
            <datalist id="ce-model-presets">
              {(MODEL_PRESETS[s.provider] ?? []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>

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

            <div className="mt-5 border-t border-line pt-4">
              <label className="block text-sm font-medium">
                Adversary model{" "}
                <span className="font-normal text-muted">— the reasoning step (optional upgrade)</span>
              </label>
              <p className="mt-1 text-xs text-muted">
                Use a stronger model just for the Adversary (e.g. Claude Opus 4.8). Synthesis and the
                carousel stay on your default.
              </p>
              <select
                value={s.adversaryProvider ?? ""}
                onChange={(e) =>
                  update({ adversaryProvider: (e.target.value || undefined) as Provider | undefined })
                }
                className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm"
              >
                <option value="">Same as default</option>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {PROVIDER_LABELS[p]}
                  </option>
                ))}
              </select>
              {s.adversaryProvider && (
                <>
                  <input
                    value={s.adversaryModel ?? ""}
                    onChange={(e) => update({ adversaryModel: e.target.value })}
                    placeholder="model id"
                    list="ce-adv-presets"
                    className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm"
                  />
                  <datalist id="ce-adv-presets">
                    {(MODEL_PRESETS[s.adversaryProvider] ?? []).map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  {s.adversaryProvider !== "ollama" && (
                    <input
                      type="password"
                      value={s.adversaryApiKey ?? ""}
                      onChange={(e) => update({ adversaryApiKey: e.target.value })}
                      placeholder="API key for the adversary model"
                      className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm"
                    />
                  )}
                </>
              )}
            </div>

            {server?.signedIn && (
              <div className="mt-5 rounded-lg border border-line bg-ink/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Keys saved to your account</span>
                  <span className="text-xs text-muted">encrypted at rest · synced across devices</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CLOUD_KEYABLE.map((p) => (
                    <span
                      key={p}
                      className={`rounded-md border px-2 py-0.5 font-mono text-xs ${
                        server[p]
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-line text-muted"
                      }`}
                    >
                      {server[p] ? "✓" : "○"} {p}
                    </span>
                  ))}
                </div>
                <button
                  onClick={saveToAccount}
                  disabled={savingCloud}
                  className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-surface disabled:opacity-50"
                >
                  {savingCloud ? "Saving…" : "Save current key(s) to my account"}
                </button>
                {cloudMsg && <p className="mt-2 text-xs text-cool">{cloudMsg}</p>}
              </div>
            )}

            {server && server.configured && !server.signedIn && (
              <p className="mt-5 rounded-lg border border-line bg-ink/40 p-3 text-xs text-muted">
                Sign in to save keys to your account so you don&rsquo;t have to re-enter them on every
                device. Until then, keys live only in this browser.
              </p>
            )}

            <p className="mt-5 rounded-lg border border-line bg-ink/40 p-3 text-xs text-muted">
              This run → Synthesize · Carousel:{" "}
              <span className="text-fg">
                {PROVIDER_SHORT[s.provider]} · {s.model || DEFAULT_MODELS[s.provider]}
              </span>{" "}
              · Adversary:{" "}
              <span className="text-fg">
                {s.adversaryProvider
                  ? `${PROVIDER_SHORT[s.adversaryProvider]} · ${s.adversaryModel || DEFAULT_MODELS[s.adversaryProvider]}`
                  : "same as default"}
              </span>
            </p>

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
